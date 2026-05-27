/**
 * Authentication Constants
 * Centralized constants for auth module
 */

export enum TokenType {
  EMAIL_VERIFICATION = 'email-verification',
  PASSWORD_RESET = 'password-reset',
}

export const DEFAULT_TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
  EMAIL_VERIFICATION: '24h',
  PASSWORD_RESET: '1h',
} as const;

export const AUTH_CONFIG = {
  BCRYPT_ROUNDS: 10,
} as const;
