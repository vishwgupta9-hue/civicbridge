import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { config } from "../config/index.js";

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: Role;
  organizationId?: string | null;
}

/**
 * Sign a JWT token for an authenticated user.
 */
export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Verify a JWT token and return the decoded payload.
 * Throws an error if invalid or expired.
 */
export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
}
