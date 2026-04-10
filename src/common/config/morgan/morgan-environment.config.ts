/**
 * Morgan Logging Configuration
 * Environment variables for controlling HTTP request logging behavior
 */

export interface MorganEnvironment {
  // Enable/disable HTTP request logging
  ENABLE_HTTP_LOGGING?: string;

  // Logging level: 'dev', 'combined', 'short', 'tiny', 'custom'
  HTTP_LOG_FORMAT?: string;

  // Skip successful requests (< 400 status codes) in production
  LOG_ERRORS_ONLY?: string;

  // Enable security-focused logging for auth routes
  ENABLE_SECURITY_LOGGING?: string;

  // Custom log file path (if file logging is desired)
  HTTP_LOG_FILE_PATH?: string;
}

export const getMorganEnvironmentConfig = (): MorganEnvironment => ({
  ENABLE_HTTP_LOGGING: process.env.ENABLE_HTTP_LOGGING || 'true',
  HTTP_LOG_FORMAT: process.env.HTTP_LOG_FORMAT || 'auto', // 'auto' means environment-based
  LOG_ERRORS_ONLY: process.env.LOG_ERRORS_ONLY || 'false',
  ENABLE_SECURITY_LOGGING: process.env.ENABLE_SECURITY_LOGGING || 'true',
  HTTP_LOG_FILE_PATH: process.env.HTTP_LOG_FILE_PATH,
});
