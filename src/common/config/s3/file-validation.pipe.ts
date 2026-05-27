import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

// ─── File Size Constants ──────────────────────────────────────────────────────
export const FILE_LIMITS = {
  ONE_MB: 1 * 1024 * 1024,
  TWO_MB: 2 * 1024 * 1024,
  FIVE_MB: 5 * 1024 * 1024,
  TEN_MB: 10 * 1024 * 1024,
  FIFTY_MB: 50 * 1024 * 1024,
  TWO_HUNDRED_MB: 200 * 1024 * 1024,
  FIVE_HUNDRED_MB: 500 * 1024 * 1024,
} as const;

// ─── Allowed MIME Type Groups ────────────────────────────────────────────────
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

/** Use when a transcoding pipeline is in place */
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  'video/ogg',
] as const;

/** Use when there is NO transcoding pipeline — these play natively in all browsers */
export const ALLOWED_VIDEO_TYPES_STRICT = ['video/mp4', 'video/webm'] as const;

// ─── S3 Folder Templates ─────────────────────────────────────────────────────
/**
 * Central folder-key templates for every entity type.
 * Use `buildS3Folder()` to fill in the `{id}` placeholder.
 * Never hardcode S3 folder paths in services or controllers.
 */
export const S3_FOLDERS = {
  USER_AVATAR: 'users/{userId}/avatar',
  USER_DOCUMENT: 'users/{userId}/documents',
  PRODUCT_IMAGE: 'products/{productId}/images',
  PRODUCT_VIDEO: 'products/{productId}/videos',
  ORDER_ATTACHMENT: 'orders/{orderId}/attachments',
} as const;

/**
 * Replaces `{placeholder}` in an `S3_FOLDERS` template with a real entity ID.
 * Always use this instead of string concatenation.
 *
 * @example
 * buildS3Folder(S3_FOLDERS.USER_AVATAR, 'userId', user.id)
 * // → 'users/abc-123/avatar'
 */
export function buildS3Folder(
  template: string,
  placeholder: string,
  id: string,
): string {
  return template.replace(`{${placeholder}}`, id);
}

// ─── FileValidationPipe ───────────────────────────────────────────────────────
export interface FileValidationOptions {
  allowedMimeTypes: readonly string[];
  maxSizeBytes?: number;
  /** If false, a missing file is silently allowed. Defaults to true. */
  required?: boolean;
}

/**
 * Validates an uploaded file for MIME type and byte size.
 * Pass as the argument to `@UploadedFile()`.
 *
 * @example
 * @UploadedFile(new FileValidationPipe({ allowedMimeTypes: ALLOWED_IMAGE_TYPES, maxSizeBytes: FILE_LIMITS.FIVE_MB }))
 * file: Express.Multer.File
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly allowedMimeTypes: readonly string[];
  private readonly maxSizeBytes: number;
  private readonly required: boolean;

  constructor(options: FileValidationOptions) {
    this.allowedMimeTypes = options.allowedMimeTypes;
    this.maxSizeBytes = options.maxSizeBytes ?? FILE_LIMITS.FIVE_MB;
    this.required = options.required ?? true;
  }

  transform(file: Express.Multer.File, _metadata: ArgumentMetadata) {
    if (!file) {
      if (this.required) {
        throw new BadRequestException('File is required.');
      }
      return file;
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Allowed: ${this.allowedMimeTypes.join(', ')}.`,
      );
    }

    if (file.size > this.maxSizeBytes) {
      const limitMb = (this.maxSizeBytes / (1024 * 1024)).toFixed(0);
      throw new BadRequestException(
        `File too large. Maximum allowed size is ${limitMb} MB.`,
      );
    }

    return file;
  }
}
