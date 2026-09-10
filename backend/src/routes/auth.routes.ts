import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role, OrganizationType } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { signToken } from "../utils/jwt.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z
    .string({ required_error: "Full name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string({ required_error: "Email address is required" })
    .trim()
    .email("Invalid email address"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
  role: z.enum(
    [Role.CITIZEN, Role.UNIVERSITY, Role.STARTUP, Role.INDUSTRY, Role.ADMIN],
    { required_error: "Please select a valid role" }
  ),
  district: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  organizationName: z.string().trim().optional().nullable(),
});

/**
 * POST /api/auth/register
 * Registers a new user with one of the allowed public roles (CITIZEN, UNIVERSITY, STARTUP, INDUSTRY).
 * ADMIN registration is strictly disallowed from this endpoint.
 */
router.post("/register", async (req: Request, res: Response) => {
  const parseResult = registerSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  const { name, email, password, role, district, phone, organizationName } = parseResult.data;
  const normalizedEmail = email.toLowerCase();

  // Guard: ADMIN registration is strictly forbidden via public registration
  if (role === Role.ADMIN) {
    res.status(403).json({
      success: false,
      error: "Government / Admin accounts cannot be created via public registration.",
    });
    return;
  }

  // Institutional roles require an organization name
  const isInstitutional = role === Role.UNIVERSITY || role === Role.STARTUP || role === Role.INDUSTRY;
  if (isInstitutional && (!organizationName || !organizationName.trim())) {
    res.status(400).json({
      success: false,
      error: `An institution/organization name is required for ${role} accounts.`,
    });
    return;
  }

  try {
    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: "An account with this email address already exists. Please sign in instead.",
      });
      return;
    }

    // Hash password with 12 bcrypt salt rounds (consistent with seed & specs)
    const passwordHash = await bcrypt.hash(password, 12);

    let organizationId: string | null = null;
    let organizationData: any = null;

    // For institutional users, link to existing or create new Organization
    if (isInstitutional && organizationName) {
      const trimmedOrgName = organizationName.trim();
      const orgType = role as unknown as OrganizationType;

      // Check if an organization with this name and matching type already exists
      let org = await prisma.organization.findFirst({
        where: {
          name: { equals: trimmedOrgName, mode: "insensitive" },
          type: orgType,
        },
      });

      if (!org) {
        org = await prisma.organization.create({
          data: {
            name: trimmedOrgName,
            type: orgType,
            district: district || "Ranchi",
            state: "Jharkhand",
            contactEmail: normalizedEmail,
            contactPhone: phone || null,
            domainTags: [],
            expertiseTags: [],
          },
        });
      }

      organizationId = org.id;
      organizationData = {
        id: org.id,
        name: org.name,
        type: org.type,
      };
    }

    // Create the new User
    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        district: district || (role === Role.CITIZEN ? "Ranchi" : null),
        phone: phone || null,
        organizationId,
      },
      include: {
        organization: true,
      },
    });

    // Issue JWT token consistent with current auth session format
    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      organizationId: newUser.organizationId,
    });

    res.status(201).json({
      success: true,
      message: "Account registered successfully.",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        district: newUser.district,
        phone: newUser.phone,
        organizationId: newUser.organizationId,
        organization: organizationData || (newUser.organization ? {
          id: newUser.organization.id,
          name: newUser.organization.name,
          type: newUser.organization.type,
        } : null),
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred during account registration.",
      details: err.message,
    });
  }
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
