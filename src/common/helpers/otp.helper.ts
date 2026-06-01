import { randomInt } from 'crypto';

/**
 * Generates a cryptographically secure numeric OTP.
 * Uses Node's crypto.randomInt — safe for SonarQube and security audits.
 *
 * @param length - Number of digits (default: 6)
 * @returns OTP string e.g. '482031'
 */
export function generateOtp(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length); // randomInt max is exclusive
  return randomInt(min, max).toString();
}
