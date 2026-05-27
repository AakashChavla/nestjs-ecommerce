/**
 * Authentication Types & Interfaces
 * Centralized type definitions for auth module
 */

import { UserRole } from '@prisma/client';

/**
 * JWT Payload for Access Token
 */
export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * JWT Payload for Refresh Token
 */
export interface JwtRefreshPayload {
  sub: string;
  version: number;
  iat?: number;
  exp?: number;
}

/**
 * JWT Payload for Email Verification Token
 */
export interface JwtVerificationPayload {
  userId: string;
  type: string;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated User Context
 * Attached to request.user after JWT validation
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion?: number;
}
