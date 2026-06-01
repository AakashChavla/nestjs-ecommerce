import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './config/database/database.module';
import { MailModule } from './config/mail/mail.module';
import { RedisModule, S3Module } from './config';
import { WhatsAppModule } from './config/whatsapp';

@Global()
@Module({
  imports: [DatabaseModule, MailModule, S3Module, WhatsAppModule, RedisModule],
  exports: [DatabaseModule, MailModule, S3Module, WhatsAppModule, RedisModule],
})
export class CommonModule {}
