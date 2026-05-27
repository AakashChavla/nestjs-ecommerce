import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';

// ─── Return Types ─────────────────────────────────────────────────────────────

export interface UploadResult {
  /** S3 object key — always store this in the database, never the full URL */
  key: string;
  /** Public or CDN URL for the object */
  url: string;
  bucket: string;
  size: number;
  mimeType: string;
}

export interface PresignedUrlResult {
  url: string;
  expiresInSeconds: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class S3AwsService implements OnModuleInit {
  private readonly logger = new Logger(S3AwsService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  /** Chunk size for multipart uploads: 10 MB */
  private readonly MULTIPART_CHUNK_SIZE = 10 * 1024 * 1024;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.getOrThrow<string>('AWS_REGION');
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME');

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async onModuleInit() {
    await this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log('✅ AWS S3 connected successfully');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `⚠️  S3 connection failed — uploads will not work: ${errorMessage}`,
      );
    }
  }

  // ─── Key Helper ────────────────────────────────────────────────────────────

  /**
   * Builds a unique S3 object key from a folder prefix and original filename.
   *
   * @example
   * buildKey('users/abc-123/avatar', 'photo.jpg')
   * // → 'users/abc-123/avatar/550e8400-e29b-41d4-a716-446655440000.jpg'
   */
  buildKey(folder: string, originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    return `${folder}/${randomUUID()}${ext}`;
  }

  // ─── Public URL ────────────────────────────────────────────────────────────

  /**
   * Returns the public URL for an object key.
   * Only works when the bucket / object is publicly accessible.
   * For private objects use `getPresignedUrl()` instead.
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  // ─── Single-Request Upload ─────────────────────────────────────────────────

  /**
   * Uploads a file in a single request. Use for images and documents.
   * For videos always prefer `uploadLarge()`.
   */
  async upload(
    folder: string,
    file: Express.Multer.File,
    isPublic = false,
  ): Promise<UploadResult> {
    const key = this.buildKey(folder, file.originalname);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
      ACL: isPublic ? 'public-read' : 'private',
    });

    await this.client.send(command);
    this.logger.log(`Uploaded object: ${key} (${file.size} bytes)`);

    return {
      key,
      url: this.getPublicUrl(key),
      bucket: this.bucket,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  // ─── Multipart Upload ──────────────────────────────────────────────────────

  /**
   * Uploads a large file using S3 multipart upload.
   * Always use this for videos — never use `upload()` for video files.
   */
  async uploadLarge(
    folder: string,
    file: Express.Multer.File,
    isPublic = false,
  ): Promise<UploadResult> {
    const key = this.buildKey(folder, file.originalname);

    const { UploadId } = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: file.mimetype,
        ACL: isPublic ? 'public-read' : 'private',
      }),
    );

    const parts: { ETag: string; PartNumber: number }[] = [];
    const buffer = file.buffer;
    const totalParts = Math.ceil(buffer.length / this.MULTIPART_CHUNK_SIZE);

    try {
      for (let i = 0; i < totalParts; i++) {
        const start = i * this.MULTIPART_CHUNK_SIZE;
        const end = Math.min(start + this.MULTIPART_CHUNK_SIZE, buffer.length);
        const chunk = buffer.subarray(start, end);

        const { ETag } = await this.client.send(
          new UploadPartCommand({
            Bucket: this.bucket,
            Key: key,
            UploadId,
            PartNumber: i + 1,
            Body: chunk,
          }),
        );

        parts.push({ ETag: ETag!, PartNumber: i + 1 });
        this.logger.debug(
          `Uploaded part ${i + 1}/${totalParts} for key: ${key}`,
        );
      }

      await this.client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId,
          MultipartUpload: { Parts: parts },
        }),
      );
    } catch (err) {
      this.logger.error(`Multipart upload failed for ${key}, aborting`, err);
      await this.client.send(
        new AbortMultipartUploadCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId,
        }),
      );
      throw err;
    }

    this.logger.log(`Multipart upload complete: ${key} (${file.size} bytes)`);

    return {
      key,
      url: this.getPublicUrl(key),
      bucket: this.bucket,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  // ─── Presigned URLs ────────────────────────────────────────────────────────

  /**
   * Generates a pre-signed GET URL for secure, time-limited client downloads.
   * Use for private objects.
   *
   * @param expiresInSeconds Defaults to 3600 (1 hour)
   */
  async getPresignedUrl(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<PresignedUrlResult> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
    return { url, expiresInSeconds };
  }

  /**
   * Generates a pre-signed PUT URL so clients can upload directly to S3
   * without routing the file through your server.
   *
   * @param expiresInSeconds Defaults to 300 (5 minutes)
   */
  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresInSeconds = 300,
  ): Promise<PresignedUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
    return { url, expiresInSeconds };
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  /** Deletes a single object by key. */
  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted object: ${key}`);
  }

  /** Deletes multiple objects in a single S3 request (max 1000 keys). */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
    this.logger.log(`Deleted ${keys.length} objects`);
  }

  // ─── Existence Check ───────────────────────────────────────────────────────

  /** Returns true if the object exists in the bucket. */
  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
