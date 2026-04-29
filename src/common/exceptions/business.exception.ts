/**
 * Business Exception
 * Thrown for business logic violations and validation errors
 * HTTP 400 Bad Request
 */

import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class BusinessException extends AppException {
  constructor(message: string, errorCode: string = 'BUSINESS_ERROR') {
    super(message, HttpStatus.BAD_REQUEST, errorCode);
  }
}
