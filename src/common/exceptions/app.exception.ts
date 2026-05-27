/**
 * App Exception
 * Base custom exception class for all application exceptions
 * Carries an error code string for frontend mapping
 */

import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  /**
   * Error code for frontend error mapping
   * e.g., 'USER_NOT_FOUND', 'INVALID_CREDENTIALS', 'EMAIL_ALREADY_EXISTS'
   */
  readonly errorCode: string;

  constructor(
    message: string,
    statusCode: HttpStatus,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
  ) {
    super(
      {
        statusCode,
        message,
        errorCode,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
    this.errorCode = errorCode;
    this.name = this.constructor.name;
  }
}
