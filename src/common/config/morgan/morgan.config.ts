import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { getMorganEnvironmentConfig } from './morgan-environment.config';

/**
 * Morgan configuration for HTTP request logging
 */
export class MorganConfig {
  private static config = getMorganEnvironmentConfig();

  /**
   * Writes a log message to the console followed by a blank line
   * so each API call is visually separated in the terminal.
   */
  private static log(message: string) {
    console.log(message.trim());
    console.log(''); // ← blank line between requests
  }

  /**
   * Get Morgan middleware based on environment and configuration
   */
  static getMiddleware() {
    // Check if HTTP logging is disabled
    if (this.config.ENABLE_HTTP_LOGGING === 'false') {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    const format = this.config.HTTP_LOG_FORMAT;
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Use explicit format if specified
    if (format && format !== 'auto') {
      return this.getCustomFormatConfig(format);
    }

    // Auto-detect based on environment
    if (isProduction) {
      return this.getProductionConfig();
    } else if (isDevelopment) {
      return this.getDevelopmentConfig();
    } else {
      return this.getDefaultConfig();
    }
  }

  /**
   * Production logging configuration
   * - Uses 'combined' format for comprehensive logging
   * - Skips successful requests (< 400 status codes) if LOG_ERRORS_ONLY is true
   * - Includes all necessary information for production monitoring
   */
  private static getProductionConfig() {
    const skipSuccessful = this.config.LOG_ERRORS_ONLY === 'true';

    return morgan('combined', {
      skip: (req: Request, res: Response) => {
        return skipSuccessful && res.statusCode < 400;
      },
      stream: {
        write: (message: string) => {
          MorganConfig.log(message);
        },
      },
    });
  }

  /**
   * Custom format configuration based on format string
   */
  private static getCustomFormatConfig(format: string) {
    return morgan(format, {
      skip: (req: Request, _res: Response) => {
        return (
          req.originalUrl === '/health' || req.originalUrl === '/api/v1/health'
        );
      },
      stream: {
        write: (message: string) => {
          MorganConfig.log(message);
        },
      },
    });
  }

  /**
   * Development logging configuration
   * - Uses 'dev' format for colored, concise output
   * - Logs all requests for debugging
   */
  private static getDevelopmentConfig() {
    return morgan('dev', {
      stream: {
        write: (message: string) => {
          MorganConfig.log(message);
        },
      },
    });
  }

  /**
   * Default logging configuration
   * - Uses 'short' format as a middle ground
   * - Suitable for testing environments
   */
  private static getDefaultConfig() {
    return morgan('short', {
      stream: {
        write: (message: string) => {
          MorganConfig.log(message);
        },
      },
    });
  }

  /**
   * Custom format for detailed logging
   * Includes: timestamp, method, URL, status, response time, content length, user agent
   */
  static getCustomFormat() {
    const customFormat =
      ':date[iso] :method :url :status :res[content-length] - :response-time ms ":user-agent"';

    return morgan(customFormat, {
      skip: (req: Request, _res: Response) => {
        return (
          req.originalUrl === '/health' || req.originalUrl === '/api/v1/health'
        );
      },
      stream: {
        write: (message: string) => {
          MorganConfig.log(message);
        },
      },
    });
  }

  /**
   * Security-focused logging
   * Logs requests that might be security-related
   */
  static getSecurityConfig() {
    if (this.config.ENABLE_SECURITY_LOGGING === 'false') {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return morgan('combined', {
      skip: (req: Request, _res: Response) => {
        const isSecurityRelevant =
          _res.statusCode === 401 ||
          _res.statusCode === 403 ||
          _res.statusCode >= 500 ||
          req.originalUrl.includes('/auth/');

        return !isSecurityRelevant;
      },
      stream: {
        write: (message: string) => {
          console.log(`[SECURITY] ${message.trim()}`);
          console.log(''); // ← blank line after security logs too
        },
      },
    });
  }
}
