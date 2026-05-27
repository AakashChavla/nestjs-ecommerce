import { ConfigService } from '@nestjs/config';
import { IWhatsAppProvider } from '../interfaces/whatsapp-provider.interface';
import { BaileysProvider } from './baileys.provider';
import { DatabaseService } from '../..';

export type WhatsAppProviderName = 'baileys';

/**
 * WhatsAppProviderFactory
 *
 * Reads WHATSAPP_PROVIDER from env and returns the correct implementation.
 * Adding a new provider = create a class implementing IWhatsAppProvider,
 * add a case here. Nothing else changes.
 *
 * Default: 'baileys'
 */
export class WhatsAppProviderFactory {
  static create(
    configService: ConfigService,
    databaseService: DatabaseService,
  ): IWhatsAppProvider {
    const provider = (
      configService.get<string>('WHATSAPP_PROVIDER') ?? 'baileys'
    ).toLowerCase() as WhatsAppProviderName;

    switch (provider) {
      case 'baileys':
        return new BaileysProvider(configService, databaseService);

      default:
        throw new Error(
          `Unknown WHATSAPP_PROVIDER="${provider}". ` +
            `Supported values: baileys`,
        );
    }
  }
}
