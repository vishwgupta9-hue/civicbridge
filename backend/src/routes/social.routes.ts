import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  Role,
  ProblemStatus,
  FilterStatus,
  PriorityTier,
  ReactionType,
  NotificationType,
} from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.middleware.js";

const router = Router();

// =============================================================================
// 1. CITIZEN SOCIAL PROBLEM FEED
// =============================================================================

/**
 * GET /api/citizen/feed or GET /api/social/feed
 * Full civic social feed with filters: ALL, NEARBY, TRENDING, MOST_AFFECTED, URGENT, RECENT, IN_PROGRESS, RESOLVED
 * Annotates problems with counts and current user's reaction statuses.
 */
router.get("/feed", optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const {
      filter = "ALL",
      category,
      district,
      search,
      q,
      page = "1",
      limit = "12",
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Base filter: STRICTLY filterStatus = PASSED (adheres to AI screening visibility rule)
    const whereClause: any = {
      filterStatus: FilterStatus.PASSED,
    };

    // Category filter
    if (category && typeof category === "string" && category.trim() && category !== "ALL") {
      whereClause.category = {
        equals: category.trim(),
        mode: "insensitive",
      };
    }

    // Specific District filter (or if NEARBY is requested)
    const userDistrict = (req.user as any)?.district;
    if (filter === "NEARBY") {
      const targetDistrict = district && typeof district === "string" && district.trim()
        ? district.trim()
        : userDistrict || "East Singhbhum";
      whereClause.district = {
        equals: targetDistrict,
        mode: "insensitive",
      };
    } else if (district && typeof district === "string" && district.trim() && district !== "ALL") {
      whereClause.district = {
        equals: district.trim(),
        mode: "insensitive",
      };
    }

    // Status / Lifecycle filters
    if (filter === "IN_PROGRESS") {
      whereClause.status = ProblemStatus.IN_PROGRESS;
    } else if (filter === "RESOLVED") {
      whereClause.status = ProblemStatus.RESOLVED;
    } else if (filter === "URGENT") {
      whereClause.OR = [
        { priorityTier: PriorityTier.HIGH },
        { priorityScore: { gte: 70.0 } },
      ];
    }

    // Text search query
    const searchQuery = (search || q) as string | undefined;
    if (searchQuery && typeof searchQuery === "string" && searchQuery.trim()) {
      const term = searchQuery.trim();
      whereClause.AND = [
        {
          OR: [
            { title: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } },
            { locationText: { contains: term, mode: "insensitive" } },
            { district: { contains: term, mode: "insensitive" } },
            { category: { contains: term, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Ordering logic based on filter
    let orderBy: any = [{ createdAt: "desc" }];
    if (filter === "TRENDING") {
      // Sort by priorityScore desc, then affectedCount desc
      orderBy = [{ priorityScore: "desc" }, { affectedCount: "desc" }, { createdAt: "desc" }];
    } else if (filter === "MOST_AFFECTED") {
      orderBy = [{ affectedCount: "desc" }, { createdAt: "desc" }];
    } else if (filter === "URGENT") {
      orderBy = [{ priorityScore: "desc" }, { createdAt: "desc" }];
    } else if (filter === "RECENT") {
      orderBy = [{ createdAt: "desc" }];
    }

    const currentUserId = req.user?.id;

    // Execute queries
    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limitNum,
        include: {
          submittedBy: {
            select: {
              id: true,
              name: true,
              role: true,
              district: true,
            },
          },
          aiAnalysis: {
            select: {
              id: true,
              predictedCategory: true,
              confidenceScore: true,
              aiSummary: true,
              severityScore: true,
              affectedPeopleScore: true,
              urgencyScore: true,
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
              evidenceUpdates: true,
              proposals: true,
              businessConcepts: true,
              collaborations: true,
            },
          },
          reactions: {
            select: {
              type: true,
              userId: true,
            },
          },
        },
      }),
      prisma.problem.count({ where: whereClause }),
    ]);

    // Format feed items with aggregated reaction counts & current user states
    const feedItems = problems.map((prob) => {
      const reactions = prob.reactions || [];
      const supportCount = reactions.filter((r) => r.type === ReactionType.SUPPORT).length;
      const followCount = reactions.filter((r) => r.type === ReactionType.FOLLOW).length;
      const affectedReactionCount = reactions.filter((r) => r.type === ReactionType.AFFECTED).length;

      const hasAffected = currentUserId
        ? reactions.some((r) => r.userId === currentUserId && r.type === ReactionType.AFFECTED)
        : false;
      const hasSupported = currentUserId
        ? reactions.some((r) => r.userId === currentUserId && r.type === ReactionType.SUPPORT)
        : false;
      const hasFollowed = currentUserId
        ? reactions.some((r) => r.userId === currentUserId && r.type === ReactionType.FOLLOW)
        : false;

      // Clean reactions array from response to keep payload light
      const rest = { ...prob };
      delete (rest as any).reactions;

      return {
        ...rest,
        commentCount: prob._count?.comments || 0,
        evidenceCount: prob._count?.evidenceUpdates || 0,
        supportCount,
        followCount,
        affectedReactionCount,
        userReactions: {
          hasAffected,
          hasSupported,
          hasFollowed,
        },
      };
    });

    res.status(200).json({
      success: true,
      filter,
      district: filter === "NEARBY" ? (userDistrict || "East Singhbhum") : (district || "ALL"),
      problems: feedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch citizen problem feed.",
      details: err.message,
    });
  }
});

// =============================================================================
// 2. CIVIC SOCIAL REACTIONS (AFFECTED ME, SUPPORT, FOLLOW)
// =============================================================================

const reactSchema = z.object({
  type: z.enum(["AFFECTED", "SUPPORT", "FOLLOW"]),
});

/**
 * POST /api/problems/:id/react
 * Toggles a civic reaction for the authenticated citizen.
 * If type is "AFFECTED", synchronously increments or decrements Problem.affectedCount.
 */
router.post("/problems/:id/react", authenticate, async (req: Request, res: Response) => {
  const { id: problemId } = req.params;
  const parse = reactSchema.safeParse(req.body);

  if (!parse.success) {
    res.status(400).json({
      success: false,
      error: "Invalid reaction type. Must be AFFECTED, SUPPORT, or FOLLOW.",
    });
    return;
  }

  const { type } = parse.data;
  const userId = req.user!.id;
  const userName = req.user!.name || "A citizen";

  try {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, title: true, affectedCount: true, submittedById: true },
    });

    if (!problem) {
      res.status(404).json({ success: false, error: "Problem record not found." });
      return;
    }

    // Check if reaction already exists
    const existing = await prisma.problemReaction.findUnique({
      where: {
        userId_problemId_type: {
          userId,
          problemId,
          type: type as ReactionType,
        },
      },
    });

    let active = false;
    let newAffectedCount = problem.affectedCount;

    if (existing) {
      // Toggle off (remove reaction)
      await prisma.problemReaction.delete({
        where: { id: existing.id },
      });
      active = false;

      // If AFFECTED reaction is removed, decrement affectedCount (minimum 1)
      if (type === "AFFECTED") {
        newAffectedCount = Math.max(1, problem.affectedCount - 1);
        await prisma.problem.update({
          where: { id: problemId },
          data: { affectedCount: newAffectedCount },
        });
      }
    } else {
      // Toggle on (create reaction)
      await prisma.problemReaction.create({
        data: {
          userId,
          problemId,
          type: type as ReactionType,
        },
      });
      active = true;

      // If AFFECTED reaction is added, increment affectedCount
      if (type === "AFFECTED") {
        newAffectedCount = problem.affectedCount + 1;
        await prisma.problem.update({
          where: { id: problemId },
          data: { affectedCount: newAffectedCount },
        });
      }

      // Notify the problem author if someone else supports or is affected
      if (problem.submittedById !== userId) {
        let notifTitle = "";
        let notifMsg = "";
        if (type === "AFFECTED") {
          notifTitle = "Citizen Affected by Your Report";
          notifMsg = `${userName} also confirmed they are affected by "${problem.title.slice(0, 50)}...". Total affected: ${newAffectedCount}.`;
        } else if (type === "SUPPORT") {
          notifTitle = "Community Support Received";
          notifMsg = `${userName} supported your civic problem "${problem.title.slice(0, 50)}...".`;
        }

        if (notifTitle) {
          await prisma.notification.create({
            data: {
              userId: problem.submittedById,
              actorId: userId,
              problemId,
              type: NotificationType.STATUS_CHANGE,
              title: notifTitle,
              message: notifMsg,
            },
          });
        }
      }
    }

    // Recalculate reaction counts for response
    const counts = await prisma.problemReaction.groupBy({
      by: ["type"],
      where: { problemId },
      _count: { type: true },
    });

    const supportCount = counts.find((c) => c.type === ReactionType.SUPPORT)?._count.type || 0;
    const followCount = counts.find((c) => c.type === ReactionType.FOLLOW)?._count.type || 0;

    res.status(200).json({
      success: true,
      active,
      type,
      affectedCount: newAffectedCount,
      supportCount,
      followCount,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to process reaction.",
      details: err.message,
    });
  }
});

// =============================================================================
// 3. COMMENTS & DISCUSSION SYSTEM
// =============================================================================

const commentSchema = z.object({
  content: z
    .string({ required_error: "Comment content is required" })
    .trim()
    .min(2, "Comment must be at least 2 characters")
    .max(1500, "Comment cannot exceed 1500 characters"),
  parentId: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/problems/:id/comments
 * Fetches all threaded comments for a problem.
 */
router.get("/problems/:id/comments", optionalAuthenticate, async (req: Request, res: Response) => {
  const { id: problemId } = req.params;

  try {
    const rawComments = await prisma.problemComment.findMany({
      where: { problemId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            district: true,
          },
        },
      },
    });

    // Structure into top-level comments and nested replies
    const commentMap = new Map<string, any>();
    const rootComments: any[] = [];

    for (const c of rawComments) {
      commentMap.set(c.id, { ...c, replies: [] });
    }

    for (const c of rawComments) {
      const item = commentMap.get(c.id);
      if (c.parentId && commentMap.has(c.parentId)) {
        commentMap.get(c.parentId).replies.push(item);
      } else {
        rootComments.push(item);
      }
    }

    res.status(200).json({
      success: true,
      count: rawComments.length,
      comments: rootComments,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch comments.",
      details: err.message,
    });
  }
});

/**
 * POST /api/problems/:id/comments
 * Creates a top-level comment or threaded reply.
 */
router.post("/problems/:id/comments", authenticate, async (req: Request, res: Response) => {
  const { id: problemId } = req.params;
  const parse = commentSchema.safeParse(req.body);

  if (!parse.success) {
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: parse.error.flatten().fieldErrors,
    });
    return;
  }

  const { content, parentId } = parse.data;
  const userId = req.user!.id;
  const userName = req.user!.name || "A citizen";

  try {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, title: true, submittedById: true },
    });

    if (!problem) {
      res.status(404).json({ success: false, error: "Problem not found." });
      return;
    }

    let parentComment: any = null;
    if (parentId) {
      parentComment = await prisma.problemComment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment || parentComment.problemId !== problemId) {
        res.status(400).json({ success: false, error: "Parent comment does not exist." });
        return;
      }
    }

    const comment = await prisma.problemComment.create({
      data: {
        problemId,
        authorId: userId,
        parentId: parentId || null,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            district: true,
          },
        },
      },
    });

    // Notify author of problem or parent comment
    if (parentId && parentComment && parentComment.authorId !== userId) {
      await prisma.notification.create({
        data: {
          userId: parentComment.authorId,
          actorId: userId,
          problemId,
          type: NotificationType.REPLY,
          title: "New Reply on Your Comment",
          message: `${userName} replied: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`,
        },
      });
    } else if (!parentId && problem.submittedById !== userId) {
      await prisma.notification.create({
        data: {
          userId: problem.submittedById,
          actorId: userId,
          problemId,
          type: NotificationType.COMMENT,
          title: "New Comment on Your Problem",
          message: `${userName} commented: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`,
        },
      });
    }

    res.status(201).json({
      success: true,
      comment: {
        ...comment,
        replies: [],
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to post comment.",
      details: err.message,
    });
  }
});

/**
 * DELETE /api/comments/:id
 * Deletes a comment (restricted to author or ADMIN).
 */
router.delete("/comments/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  try {
    const comment = await prisma.problemComment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({ success: false, error: "Comment not found." });
      return;
    }

    if (comment.authorId !== userId && userRole !== Role.ADMIN) {
      res.status(403).json({
        success: false,
        error: "You are not authorized to delete this comment.",
      });
      return;
    }

    await prisma.problemComment.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to delete comment.",
      details: err.message,
    });
  }
});

/**
 * POST /api/comments/:id/report
 * Flags a comment as inappropriate for moderator review.
 */
router.post("/comments/:id/report", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason = "Inappropriate civic content" } = req.body;

  try {
    const comment = await prisma.problemComment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({ success: false, error: "Comment not found." });
      return;
    }

    const updated = await prisma.problemComment.update({
      where: { id },
      data: {
        isReported: true,
        reportReason: String(reason).slice(0, 300),
      },
    });

    res.status(200).json({
      success: true,
      message: "Comment flagged for moderation review.",
      comment: updated,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to report comment.",
      details: err.message,
    });
  }
});

// =============================================================================
// 4. COMMUNITY EVIDENCE & TIMELINE UPDATES
// =============================================================================

const evidenceSchema = z.object({
  title: z
    .string({ required_error: "Update title is required" })
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title cannot exceed 150 characters"),
  description: z
    .string({ required_error: "Description is required" })
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
  photoUrl: z.string().trim().optional().nullable(),
  videoUrl: z.string().trim().optional().nullable(),
});

/**
 * GET /api/problems/:id/evidence-updates
 * Fetches chronological evidence updates added by the community.
 */
router.get("/problems/:id/evidence-updates", optionalAuthenticate, async (req: Request, res: Response) => {
  const { id: problemId } = req.params;

  try {
    const updates = await prisma.problemEvidenceUpdate.findMany({
      where: { problemId },
      orderBy: { createdAt: "asc" },
      include: {
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
      count: updates.length,
      updates,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch evidence updates.",
      details: err.message,
    });
  }
});

/**
 * POST /api/problems/:id/evidence-updates
 * Contributes new photographic or observational evidence to an active problem.
 */
router.post("/problems/:id/evidence-updates", authenticate, async (req: Request, res: Response) => {
  const { id: problemId } = req.params;
  const parse = evidenceSchema.safeParse(req.body);

  if (!parse.success) {
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: parse.error.flatten().fieldErrors,
    });
    return;
  }

  const { title, description, photoUrl, videoUrl } = parse.data;
  const userId = req.user!.id;
  const userName = req.user!.name || "A citizen";

  try {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, title: true, submittedById: true },
    });

    if (!problem) {
      res.status(404).json({ success: false, error: "Problem record not found." });
      return;
    }

    const evidence = await prisma.problemEvidenceUpdate.create({
      data: {
        problemId,
        submittedById: userId,
        title,
        description,
        photoUrl: photoUrl || null,
        videoUrl: videoUrl || null,
      },
      include: {
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

    // Notify problem author if someone else contributed evidence
    if (problem.submittedById !== userId) {
      await prisma.notification.create({
        data: {
          userId: problem.submittedById,
          actorId: userId,
          problemId,
          type: NotificationType.EVIDENCE_UPDATE,
          title: "New Evidence Contributed",
          message: `${userName} contributed new evidence "${title}" to your reported problem.`,
        },
      });
    }

    res.status(201).json({
      success: true,
      update: evidence,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to post evidence update.",
      details: err.message,
    });
  }
});

// =============================================================================
// 5. CITIZEN PROFILE & CIVIC ACTIVITY AGGREGATION
// =============================================================================

/**
 * GET /api/citizen/profile
 * Aggregates complete civic track record for the authenticated citizen:
 * - Problems reported
 * - Problems supported
 * - Problems followed
 * - Evidence contributed
 * - Resolved problems
 * - Recent activity timeline
 */
router.get("/profile", authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const [
      reportedProblems,
      reactions,
      evidenceUpdates,
    ] = await Promise.all([
      // Problems reported by this citizen
      prisma.problem.findMany({
        where: { submittedById: userId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              comments: true,
              reactions: true,
              proposals: true,
              businessConcepts: true,
            },
          },
        },
      }),

      // Reactions made by this citizen
      prisma.problemReaction.findMany({
        where: { userId },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              category: true,
              district: true,
              status: true,
              verificationStatus: true,
              priorityTier: true,
              affectedCount: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Evidence updates contributed by this citizen
      prisma.problemEvidenceUpdate.findMany({
        where: { submittedById: userId },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              district: true,
              category: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const supportedReactions = reactions.filter((r) => r.type === ReactionType.SUPPORT);
    const followedReactions = reactions.filter((r) => r.type === ReactionType.FOLLOW);
    const affectedReactions = reactions.filter((r) => r.type === ReactionType.AFFECTED);

    const resolvedReported = reportedProblems.filter((p) => p.status === ProblemStatus.RESOLVED);
    const resolvedSupported = supportedReactions.filter(
      (r) => r.problem?.status === ProblemStatus.RESOLVED
    );

    // Build unified recent activity timeline
    const activityItems: any[] = [];

    for (const p of reportedProblems.slice(0, 10)) {
      activityItems.push({
        type: "REPORTED_PROBLEM",
        title: `Reported civic problem: "${p.title}"`,
        timestamp: p.createdAt,
        problemId: p.id,
        badge: p.status,
      });
    }

    for (const s of supportedReactions.slice(0, 10)) {
      if (s.problem) {
        activityItems.push({
          type: "SUPPORTED_PROBLEM",
          title: `Supported community issue: "${s.problem.title}"`,
          timestamp: s.createdAt,
          problemId: s.problem.id,
          badge: s.problem.status,
        });
      }
    }

    for (const e of evidenceUpdates.slice(0, 10)) {
      activityItems.push({
        type: "CONTRIBUTED_EVIDENCE",
        title: `Contributed evidence "${e.title}" to "${e.problem?.title}"`,
        timestamp: e.createdAt,
        problemId: e.problemId,
      });
    }

    activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
      success: true,
      stats: {
        reportedCount: reportedProblems.length,
        supportedCount: supportedReactions.length,
        followedCount: followedReactions.length,
        affectedCount: affectedReactions.length,
        evidenceCount: evidenceUpdates.length,
        resolvedCount: resolvedReported.length + resolvedSupported.length,
      },
      reportedProblems,
      supportedProblems: supportedReactions.map((s) => s.problem).filter(Boolean),
      followedProblems: followedReactions.map((f) => f.problem).filter(Boolean),
      evidenceContributed: evidenceUpdates,
      recentActivity: activityItems.slice(0, 15),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch citizen profile data.",
      details: err.message,
    });
  }
});

// =============================================================================
// 6. NOTIFICATIONS SYSTEM
// =============================================================================

/**
 * GET /api/notifications
 * Fetches recent notifications for the authenticated user with unread count.
 */
router.get("/notifications", authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              district: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch notifications.",
      details: err.message,
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marks a specific notification as read.
 */
router.patch("/notifications/:id/read", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    res.status(200).json({ success: true, message: "Notification marked as read." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Failed to update notification." });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications for current user as read.
 */
router.patch("/notifications/read-all", authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.status(200).json({ success: true, message: "All notifications marked as read." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Failed to mark all as read." });
  }
});

export default router;
