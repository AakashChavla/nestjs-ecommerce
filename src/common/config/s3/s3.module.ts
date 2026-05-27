import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3AwsService } from './s3.service';

@Module({
  imports: [ConfigModule],
  providers: [S3AwsService],
  exports: [S3AwsService],
})
export class S3Module {}
