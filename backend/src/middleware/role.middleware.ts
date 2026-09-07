import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

/**
 * Role-Based Access Control (RBAC) Middleware:
 * Ensures the authenticated user possesses one of the allowed roles.
 */
export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required before role verification.",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Authorized roles: [${allowedRoles.join(", ")}]. Current role: ${req.user.role}.`,
      });
      return;
    }

    next();
  };
}
