import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { signToken } from "../utils/jwt.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * POST /api/auth/login
 * Verifies credentials and issues a JWT token.
 */
router.post("/login", async (req: Request, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password } = parseResult.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
      return;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
        organizationId: user.organizationId,
        organization: user.organization ? {
          id: user.organization.id,
          name: user.organization.name,
          type: user.organization.type,
        } : null,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "An error occurred during authentication.",
    });
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user information.
 */
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { organization: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        district: user.district,
        organizationId: user.organizationId,
        organization: user.organization ? {
          id: user.organization.id,
          name: user.organization.name,
          type: user.organization.type,
        } : null,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      error: "Failed to fetch user profile.",
    });
  }
});

/**
 * GET /api/auth/test-role-admin
 * Verification endpoint: requires ADMIN role.
 */
router.get("/test-role-admin", authenticate, authorizeRoles(Role.ADMIN), (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Admin authorization confirmed.",
    user: req.user,
  });
});

/**
 * GET /api/auth/test-role-university
 * Verification endpoint: requires UNIVERSITY role.
 */
router.get("/test-role-university", authenticate, authorizeRoles(Role.UNIVERSITY), (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "University authorization confirmed.",
    user: req.user,
  });
});

export default router;
