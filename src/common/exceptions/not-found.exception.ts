/**
 * Not Found Exception
 * Thrown when a requested resource is not found
 */

import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class NotFoundException extends AppException {
  constructor(message: string, errorCode: string = 'NOT_FOUND') {
    super(message, HttpStatus.NOT_FOUND, errorCode);
  }
}
