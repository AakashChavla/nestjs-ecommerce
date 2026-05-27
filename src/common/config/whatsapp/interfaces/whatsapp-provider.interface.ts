/**
 * Core contract every WhatsApp provider must fulfill.
 *
 * Adding a new provider (Twilio, Meta Cloud API, etc.) in the future
 * only requires implementing this interface — zero changes to callers.
 */
export interface WhatsAppMessage {
  to: string; // E.164 format: +91XXXXXXXXXX
  body: string;
}

export interface WhatsAppSendResult {
  messageId: string;
  to: string;
  provider: string;
  sentAt: Date;
}

export interface IWhatsAppProvider {
  /**
   * Human-readable name used in logs and error messages.
   * e.g. 'baileys', 'twilio', 'meta-cloud-api'
   */
  readonly providerName: string;

  /**
   * Called once during NestJS module init.
   * Must resolve even on failure — log the error and set isReady = false.
   */
  initialize(): Promise<void>;

  /**
   * Returns true only when the provider is fully connected and ready.
   */
  isReady(): boolean;

  /**
   * Send a raw WhatsApp message.
   */
  sendMessage(message: WhatsAppMessage): Promise<WhatsAppSendResult>;

  /**
   * Graceful shutdown — close sockets, flush queues, etc.
   * Called on NestJS application shutdown.
   */
  destroy(): Promise<void>;
}
