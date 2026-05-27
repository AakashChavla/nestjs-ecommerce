import { DatabaseService } from 'src/common';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IWhatsAppProvider } from './interfaces/whatsapp-provider.interface';
import { WhatsAppProviderFactory } from './providers/whatsapp-provider.factory';
import { whatsAppTemplates } from './whatsapp.template';

/**
 * WhatsAppService
 *
 * The single entry point for all WhatsApp messaging in the application.
 * Callers are completely decoupled from the underlying provider.
 *
 * ─── Swapping providers ───────────────────────────────────────────────────────
 * Change WHATSAPP_PROVIDER in .env. Restart. Done.
 * No code changes required outside this directory.
 *
 * ─── Adding a new high-level method ──────────────────────────────────────────
 * 1. Add the template to whatsapp.template.ts
 * 2. Add the method below following the existing pattern
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private provider: IWhatsAppProvider | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.provider = WhatsAppProviderFactory.create(
      this.configService,
      this.databaseService,
    );

    this.logger.log(
      `Initializing WhatsApp provider: [${this.provider.providerName}]`,
    );

    await this.provider.initialize();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.provider) {
      await this.provider.destroy();
      this.logger.log('WhatsApp provider shut down cleanly');
    }
  }

  // ─── Internal send with guard ────────────────────────────────────────────

  private async send(to: string, body: string): Promise<void> {
    if (!this.provider?.isReady()) {
      this.logger.warn(
        `WhatsApp provider [${this.provider?.providerName ?? 'unknown'}] ` +
          `is not ready. Skipping message to ${to}.`,
      );
      // Soft-fail: log and continue — same behaviour as MailService when SMTP
      // is misconfigured. Swap to `throw` if you want hard failures.
      return;
    }

    try {
      const result = await this.provider.sendMessage({ to, body });
      this.logger.log(
        `[${result.provider}] Message sent → ${result.to} | ID: ${result.messageId}`,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[${this.provider.providerName}] Failed to send to ${to}: ${msg}`,
      );
      throw new Error(`WhatsApp send failed: ${msg}`);
    }
  }

  // ─── Public high-level methods ────────────────────────────────────────────
  // Add new methods here as your feature set grows.
  // Every method is named after the business event, not the provider.

  async sendOtp(mobile: string, otp: string): Promise<void> {
    await this.send(mobile, whatsAppTemplates.otp(otp));
  }

  async sendMobileVerifiedMessage(mobile: string, name: string): Promise<void> {
    await this.send(mobile, whatsAppTemplates.mobileVerified(name));
  }

  async sendEmailVerifiedMessage(mobile: string, name: string): Promise<void> {
    await this.send(mobile, whatsAppTemplates.emailVerified(name));
  }

  async sendWelcomeMessage(mobile: string, name: string): Promise<void> {
    await this.send(mobile, whatsAppTemplates.welcome(name));
  }

  async sendOrderPlacedNotification(
    mobile: string,
    orderId: string,
    total: string,
  ): Promise<void> {
    await this.send(mobile, whatsAppTemplates.orderPlaced(orderId, total));
  }

  async sendOrderShippedNotification(
    mobile: string,
    orderId: string,
    trackingUrl: string,
  ): Promise<void> {
    await this.send(
      mobile,
      whatsAppTemplates.orderShipped(orderId, trackingUrl),
    );
  }

  /**
   * Escape hatch for one-off messages not covered by a template.
   * Prefer adding a typed method + template over using this directly.
   */
  async sendRaw(mobile: string, body: string): Promise<void> {
    await this.send(mobile, body);
  }
}
