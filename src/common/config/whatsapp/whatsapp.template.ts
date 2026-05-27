/**
 * WhatsApp message templates.
 *
 * Keep all user-visible strings here — same convention as mail.template.ts.
 * If you later add i18n support, replace these with i18n service calls
 * inside WhatsAppService, keeping templates as the fallback defaults.
 *
 * WhatsApp rendering notes:
 *   *text*   → bold
 *   _text_   → italic
 *   ~text~   → strikethrough
 *   ```text``` → monospace
 */

export const whatsAppTemplates = {
  otp: (otp: string): string =>
    `🔐 *E-Commerce Verification*\n\nYour OTP is: *${otp}*\n\nValid for *5 minutes*. Do not share this code with anyone.`,

  emailVerified: (name: string): string =>
    `✅ *Hello ${name}!*\n\nYour email has been verified successfully. Welcome aboard! 🎉`,

  mobileVerified: (name: string): string =>
    `✅ *Hello ${name}!*\n\nYour mobile number has been verified successfully.`,

  welcome: (name: string): string =>
    `👋 *Welcome, ${name}!*\n\nThank you for joining E-Commerce API. We're glad to have you.`,

  orderPlaced: (orderId: string, total: string): string =>
    `🛒 *Order Confirmed!*\n\nOrder ID: \`${orderId}\`\nTotal: *${total}*\n\nWe'll notify you when it ships.`,

  orderShipped: (orderId: string, trackingUrl: string): string =>
    `🚚 *Your order is on its way!*\n\nOrder ID: \`${orderId}\`\nTrack: ${trackingUrl}`,
} as const;

export type WhatsAppTemplateName = keyof typeof whatsAppTemplates;
