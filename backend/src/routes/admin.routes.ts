import { Router, Request, Response } from "express";
import { z } from "zod";
import { Role, FilterStatus, VerificationStatus } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// Protect all admin endpoints: user must be authenticated and possess Role.ADMIN
router.use(authenticate, authorizeRoles(Role.ADMIN));

const verifySchema = z.object({
  notes: z.string().trim().max(2000, "Verification notes cannot exceed 2000 characters").optional(),
});

const declineSchema = z.object({
  notes: z.string().trim().max(2000, "Decline notes cannot exceed 2000 characters").optional(),
  reason: z.string().trim().max(500, "Decline reason cannot exceed 500 characters").optional(),
});

/**
 * GET /api/admin/verification-queue
 * Returns high-priority civic problems requesting parallel Government review.
 * Only problems that are:
 *   - filterStatus = PASSED (cleared AI relevance triage)
 *   - verificationStatus = AI_SCREENED (awaiting human endorsement)
 *   - verificationRequested = true (flagged for review)
 *
 * Ordered by:
 *   - priorityScore DESC (highest priority first: HIGH, then MEDIUM, then LOW)
 *   - createdAt DESC (newest first within identical priority)
 */
router.get("/verification-queue", async (req: Request, res: Response) => {
  try {
    const queue = await prisma.problem.findMany({
      where: {
        filterStatus: FilterStatus.PASSED,
        verificationStatus: VerificationStatus.AI_SCREENED,
        verificationRequested: true,
      },
      orderBy: [
        { priorityScore: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        aiAnalysis: {
          select: {
            id: true,
            aiSummary: true,
            predictedCategory: true,
            confidenceScore: true,
            severityScore: true,
            affectedPeopleScore: true,
            frequencyScore: true,
            evidenceScore: true,
            urgencyScore: true,
            aiUrgencyScore: true,
            aiUrgencyReason: true,
            isDuplicate: true,
            duplicateSimilarity: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            role: true,
            district: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: queue.length,
      queue,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch government verification queue.",
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/problems/:id/verify
 * Endorses an eligible problem with the official GOVERNMENT_VERIFIED trust signal.
 * Requirements:
 *   - ADMIN role only
 *   - filterStatus must be PASSED
 *   - verificationStatus must currently be AI_SCREENED
 *   - Sets:
 *       verificationStatus = GOVERNMENT_VERIFIED
 *       verifiedById = authenticated admin user ID
 *       verifiedAt = current timestamp
 *       verificationNotes = admin notes (optional)
 *   - Preserves all priority fields, filterStatus, and lifecycle status completely unchanged.
 */
router.post("/problems/:id/verify", async (req: Request, res: Response) => {
  const { id } = req.params;
  const parseResult = verifySchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const problem = await prisma.problem.findUnique({
      where: { id },
    });

    if (!problem) {
      res.status(404).json({
        success: false,
        error: `Problem with ID ${id} not found.`,
      });
      return;
    }

    if (problem.filterStatus !== FilterStatus.PASSED) {
      res.status(400).json({
        success: false,
        error: `Problem cannot be verified because its filterStatus is ${problem.filterStatus}. Only PASSED problems are eligible for verification.`,
      });
      return;
    }

    if (problem.verificationStatus === VerificationStatus.GOVERNMENT_VERIFIED) {
      res.status(400).json({
        success: false,
        error: "Problem is already verified by government administration.",
      });
      return;
    }

    if (problem.verificationStatus === VerificationStatus.DECLINED_BY_GOVT) {
      res.status(400).json({
        success: false,
        error: "Problem was previously declined by government administration.",
      });
      return;
    }

    const updatedProblem = await prisma.problem.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.GOVERNMENT_VERIFIED,
        verifiedById: req.user!.id,
        verifiedAt: new Date(),
        verificationNotes: parseResult.data.notes || "Endorsed and verified by District Administration.",
      },
      include: {
        aiAnalysis: true,
        verifiedBy: {
          select: {
            id: true,
            name: true,
            role: true,
            district: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Civic problem has been officially endorsed with Government Verification.",
      problem: updatedProblem,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to verify civic problem.",
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/problems/:id/decline
 * Marks a problem as DECLINED_BY_GOVT for official verification.
 * In accordance with CivicBridge architecture:
 *   - Does NOT remove the problem from the Problem Bank.
 *   - Does NOT alter priorityScore, priorityTier, filterStatus, or lifecycle status.
 *   - Institutions and university researchers may continue exploring and solving it.
 */
router.post("/problems/:id/decline", async (req: Request, res: Response) => {
  const { id } = req.params;
  const parseResult = declineSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const problem = await prisma.problem.findUnique({
      where: { id },
    });

    if (!problem) {
      res.status(404).json({
        success: false,
        error: `Problem with ID ${id} not found.`,
      });
      return;
    }

    if (problem.filterStatus !== FilterStatus.PASSED) {
      res.status(400).json({
        success: false,
        error: `Problem cannot be declined because its filterStatus is ${problem.filterStatus}. Only PASSED problems are eligible.`,
      });
      return;
    }

    if (problem.verificationStatus === VerificationStatus.DECLINED_BY_GOVT) {
      res.status(400).json({
        success: false,
        error: "Problem has already been declined by government administration.",
      });
      return;
    }

    if (problem.verificationStatus === VerificationStatus.GOVERNMENT_VERIFIED) {
      res.status(400).json({
        success: false,
        error: "Problem was previously approved and verified by government administration.",
      });
      return;
    }

    const declineNote = parseResult.data.notes || parseResult.data.reason || "Declined for government verification upon administrative review.";

    const updatedProblem = await prisma.problem.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.DECLINED_BY_GOVT,
        verifiedById: req.user!.id,
        verifiedAt: new Date(),
        verificationNotes: declineNote,
      },
      include: {
        aiAnalysis: true,
        verifiedBy: {
          select: {
            id: true,
            name: true,
            role: true,
            district: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Civic problem verification declined. Problem remains active in Problem Bank for institutional innovation.",
      problem: updatedProblem,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to decline civic problem verification.",
      details: error.message,
    });
  }
});

export default router;
