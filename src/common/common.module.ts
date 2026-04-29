import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './config/database/database.module';
import { MailModule } from './config/mail/mail.module';

@Global()
@Module({
  imports: [DatabaseModule, MailModule],
  exports: [DatabaseModule, MailModule],
})
export class CommonModule {}
