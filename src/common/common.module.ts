import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './config/database/database.module';
import { MailModule } from './config/mail/mail.module';
import { S3Module } from './config';

@Global()
@Module({
  imports: [DatabaseModule, MailModule, S3Module],
  exports: [DatabaseModule, MailModule, S3Module],
})
export class CommonModule {}
