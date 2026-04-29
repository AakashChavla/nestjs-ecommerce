// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nContext } from 'nestjs-i18n';

interface ValidationError {
  constraints?: Record<string, string>;
}

interface HttpExceptionResponse {
  message?: string | string[];
  errors?: string[];
  statusCode?: number;
}

interface ErrorResponse {
  success: boolean;
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
  errors?: string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException | Error | unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    let errors: string[] | undefined;

    // Get i18n context for translations
    const i18n = I18nContext.current(host);

    // Handle validation errors from I18nValidationException
    if (
      exception &&
      typeof exception === 'object' &&
      'errors' in exception &&
      Array.isArray(exception.errors)
    ) {
      // Extract validation error messages from constraints
      const validationErrors: string[] = [];

      (exception.errors as ValidationError[]).forEach((error) => {
        if (error.constraints) {
          // Get all constraint messages for this field
          Object.values(error.constraints).forEach((constraintMessage) => {
            let translatedMessage: string;

            // Check if it's an i18n template (format: "key|{json}")
            if (
              typeof constraintMessage === 'string' &&
              constraintMessage.includes('|')
            ) {
              const [key, argsJson] = constraintMessage.split('|');
              try {
                const args = JSON.parse(argsJson);
                // Translate using i18n service
                translatedMessage = i18n
                  ? i18n.t(key, { args })
                  : constraintMessage;
              } catch {
                // If parsing fails, use the original message
                translatedMessage = constraintMessage;
              }
            } else {
              // Regular string message
              translatedMessage =
                typeof constraintMessage === 'string'
                  ? constraintMessage
                  : JSON.stringify(constraintMessage);
            }

            validationErrors.push(translatedMessage);
          });
        }
      });

      if (validationErrors.length > 0) {
        errors = validationErrors;
        message = 'Validation failed';
      }
    }

    if (exception instanceof HttpException) {
      const responseObj = exception.getResponse() as HttpExceptionResponse;

      if (typeof responseObj === 'object' && responseObj !== null) {
        if (Array.isArray(responseObj.message)) {
          errors = responseObj.message as string[];
          message = 'Validation failed';
        } else if (
          typeof responseObj.message === 'string' &&
          responseObj.message !== 'Bad Request'
        ) {
          message = responseObj.message;
        }

        if (
          !errors &&
          responseObj.errors &&
          Array.isArray(responseObj.errors)
        ) {
          errors = responseObj.errors;
          message = 'Validation failed';
        }
      }
    }

    // ── Logging ──────────────────────────────────────────────────────────
    // Log 5xx errors as errors (unexpected / server-side failures)
    // Log 4xx as warnings (client mistakes, not our bug)
    if (status >= 500) {
      this.logger.error(
        `[${status}] ${request.method} ${request.url} — ${String(message)}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${status}] ${request.method} ${request.url} — ${String(message)}`,
      );
    }
    // ─────────────────────────────────────────────────────────────────────

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Add errors array if validation errors exist
    if (errors && errors.length > 0) {
      errorResponse.errors = errors;
    }

    response.status(status).json(errorResponse);
  }
}
