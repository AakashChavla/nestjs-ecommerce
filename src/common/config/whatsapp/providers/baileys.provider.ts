// src/common/config/whatsapp/providers/baileys.provider.ts

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthenticationCreds,
  BufferJSON,
  DisconnectReason,
  initAuthCreds,
  makeCacheableSignalKeyStore,
  makeWASocket,
  SignalDataSet,
  SignalDataTypeMap,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import * as qrcode from 'qrcode-terminal';
import {
  IWhatsAppProvider,
  WhatsAppMessage,
  WhatsAppSendResult,
} from '../interfaces/whatsapp-provider.interface';
import { DatabaseService } from '../../../config/database/database.service';

export class BaileysProvider implements IWhatsAppProvider {
  readonly providerName = 'baileys';
  private readonly logger = new Logger(BaileysProvider.name);

  private socket: WASocket | null = null;
  private ready = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly stateId: string;

  // ─── Auth state lives HERE — outside connect() so it survives reconnects ──
  private creds: AuthenticationCreds | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private keysInMemory: Record<string, Record<string, any>> = {};

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.stateId =
      this.configService.get<string>('WHATSAPP_BAILEYS_STATE_ID') ??
      'singleton';
  }

  // ─── DB persistence ────────────────────────────────────────────────────────

  private async loadFromDb(): Promise<void> {
    try {
      const row = await this.databaseService.whatsAppAuthState.findUnique({
        where: { id: this.stateId },
      });
      if (row) {
        this.creds = JSON.parse(
          JSON.stringify(row.creds),
          BufferJSON.reviver,
        ) as AuthenticationCreds;
        this.keysInMemory = JSON.parse(
          JSON.stringify(row.keys),
          BufferJSON.reviver,
        ) as Record<string, Record<string, unknown>>;
        this.logger.log('Auth state loaded from DB');
        return;
      }
    } catch (err) {
      this.logger.warn(`Could not load auth state from DB: ${String(err)}`);
    }
    // No row yet — bootstrap fresh credentials
    this.creds = initAuthCreds();
    this.keysInMemory = {};
    this.logger.log('No saved auth state — starting fresh (QR scan required)');
  }

  private async saveToDb(): Promise<void> {
    try {
      await this.databaseService.whatsAppAuthState.upsert({
        where: { id: this.stateId },
        update: {
          creds: JSON.parse(JSON.stringify(this.creds, BufferJSON.replacer)),
          keys: JSON.parse(
            JSON.stringify(this.keysInMemory, BufferJSON.replacer),
          ),
        },
        create: {
          id: this.stateId,
          creds: JSON.parse(JSON.stringify(this.creds, BufferJSON.replacer)),
          keys: JSON.parse(
            JSON.stringify(this.keysInMemory, BufferJSON.replacer),
          ),
        },
      });
    } catch (err) {
      this.logger.error(`Failed to save auth state to DB: ${String(err)}`);
    }
  }

  /**
   * Wipes the DB row and resets in-memory state to fresh credentials.
   * Called on logout — automatically triggers a new QR without restart.
   */
  private async clearAuthState(): Promise<void> {
    try {
      // Drop the reference immediately — socket is already dead on logout
      this.socket = null;
      this.ready = false;

      await this.databaseService.whatsAppAuthState.deleteMany({
        where: { id: this.stateId },
      });

      // Initialize fresh creds so connect() doesn't hit the null guard
      this.creds = initAuthCreds();
      this.keysInMemory = {};

      this.logger.log(
        'WhatsApp auth state cleared from DB and memory — showing fresh QR',
      );
    } catch (err) {
      this.logger.error(`Failed to clear auth state: ${String(err)}`);
    }
  }

  // ─── Socket lifecycle ──────────────────────────────────────────────────────

  private closeSocket(): void {
    if (this.socket) {
      try {
        // Baileys types removeAllListeners to require an event arg,
        // but the underlying EventEmitter supports no-arg — cast to access it
        (
          this.socket.ev as unknown as { removeAllListeners(): void }
        ).removeAllListeners();
        this.socket.end(undefined);
      } catch {
        // ignore
      }
      this.socket = null;
    }
    this.ready = false;
  }

  /**
   * Called once on startup. Loads auth state from DB then connects.
   */
  async initialize(): Promise<void> {
    await this.loadFromDb();
    await this.connect();
  }

  /**
   * (Re)creates the socket using the already-loaded in-memory auth state.
   * Safe to call multiple times — always uses this.creds/keysInMemory,
   * never re-reads from DB, so in-flight credential updates are never lost.
   */
  private async connect(): Promise<void> {
    if (!this.creds) {
      this.logger.error('connect() called before creds were initialized');
      return;
    }

    try {
      const pinoLogger = pino({ level: 'silent' });

      const keys = makeCacheableSignalKeyStore(
        {
          get: async <T extends keyof SignalDataTypeMap>(
            type: T,
            ids: string[],
          ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
            const bucket = this.keysInMemory[type] ?? {};
            return Object.fromEntries(
              ids.map((id) => [
                id,
                bucket[id] !== undefined
                  ? (JSON.parse(
                      JSON.stringify(bucket[id]),
                      BufferJSON.reviver,
                    ) as SignalDataTypeMap[T])
                  : undefined,
              ]),
            ) as { [id: string]: SignalDataTypeMap[T] };
          },
          set: async (data: SignalDataSet): Promise<void> => {
            for (const [type, entries] of Object.entries(data)) {
              if (!entries) continue;
              this.keysInMemory[type] = this.keysInMemory[type] ?? {};
              for (const [id, value] of Object.entries(entries)) {
                if (value != null) {
                  this.keysInMemory[type][id] = value;
                } else {
                  delete this.keysInMemory[type][id];
                }
              }
            }
            void this.saveToDb();
          },
        },
        pinoLogger,
      );

      this.socket = makeWASocket({
        auth: {
          creds: this.creds,
          keys,
        },
        logger: pinoLogger,
        printQRInTerminal: false,
        markOnlineOnConnect: false,
      });

      this.socket.ev.on('creds.update', (update) => {
        Object.assign(this.creds!, update);
        void this.saveToDb();
      });

      this.socket.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('\n\n========== WHATSAPP QR CODE ==========');
          qrcode.generate(qr, { small: true });
          console.log('======================================\n');
          this.logger.log(
            '📱 Scan the QR code above in WhatsApp → Linked Devices',
          );
        }

        if (connection === 'open') {
          this.ready = true;
          this.logger.log('✅ Baileys WhatsApp connected successfully');
        }

        if (connection === 'close') {
          this.ready = false;
          const statusCode = (lastDisconnect?.error as Boom)?.output
            ?.statusCode;

          this.logger.warn(
            `WhatsApp connection closed (code: ${statusCode ?? 'unknown'})`,
          );

          if (statusCode === DisconnectReason.loggedOut) {
            this.logger.warn(
              'WhatsApp logged out — clearing auth state and showing fresh QR...',
            );
            // Clear stale creds from DB, init fresh ones in memory,
            // then connect immediately — new QR appears without restart
            void this.clearAuthState().then(() => {
              void this.connect();
            });
            return;
          }

          // All other codes (515 restartRequired, 408 timedOut, unknown, etc.)
          // are transient — reconnect using existing in-memory creds/keys.
          this.scheduleConnect(
            statusCode === DisconnectReason.restartRequired ? 0 : 5_000,
          );
        }
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `⚠️  Baileys connect failed: ${msg}. WhatsApp messages will not be sent.`,
      );
      this.ready = false;
    }
  }

  private scheduleConnect(delayMs: number): void {
    if (this.reconnectTimer) return; // already scheduled
    this.closeSocket();
    if (delayMs === 0) {
      void this.connect();
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delayMs);
  }

  // ─── IWhatsAppProvider ─────────────────────────────────────────────────────

  isReady(): boolean {
    return this.ready && this.socket !== null;
  }

  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    if (!this.socket) throw new Error('Baileys socket not initialized');
    const jid = `${message.to.replace(/^\+/, '')}@s.whatsapp.net`;
    const result = await this.socket.sendMessage(jid, { text: message.body });
    return {
      messageId: result?.key?.id ?? 'unknown',
      to: message.to,
      provider: this.providerName,
      sentAt: new Date(),
    };
  }

  async destroy(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.closeSocket();
    this.logger.log('Baileys socket closed gracefully');
  }
}
