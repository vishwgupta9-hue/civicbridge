import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyToken } from "../utils/jwt.js";
import prisma from "../lib/prisma.js";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  district: string | null;
  organizationId: string | null;
}

// Augment Express Request type globally
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Authentication Middleware:
 * Verifies Bearer token, fetches user from database, and attaches user to req.user.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Authentication required. Please provide a valid Bearer token.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        district: true,
        organizationId: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: "User associated with this token no longer exists.",
      });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: err.name === "TokenExpiredError" ? "Token has expired." : "Invalid authentication token.",
    });
  }
}

/**
 * Optional Authentication Middleware:
 * If a valid Bearer token is provided, attaches the user to req.user.
 * If no token is provided or the token is invalid, continues as an unauthenticated request without failing.
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        district: true,
        organizationId: true,
      },
    });

    if (user) {
      req.user = user;
    }
  } catch {
    // Silently continue for optional authentication
  }

  next();
}
