import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { MailService } from './mail/mail.service';

@Global()
@Module({
  providers: [DatabaseService, MailService],
  exports: [DatabaseService, MailService],
})
export class CommonModule {}
