/**
 * Conflict Exception
 * Thrown when a resource already exists or there's a conflict
 * HTTP 409 Conflict
 */

import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class ConflictException extends AppException {
  constructor(message: string, errorCode: string = 'CONFLICT') {
    super(message, HttpStatus.CONFLICT, errorCode);
  }
}
