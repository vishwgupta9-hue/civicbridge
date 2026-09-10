import { Router, Request, Response } from "express";
import { z } from "zod";
import { Role, ProjectTrack, ProjectStatus } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = Router();

// Validation Schemas
const createProjectSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  executiveSummary: z.string().trim().min(10, "Executive summary must be at least 10 characters"),
  technicalApproach: z.string().trim().min(10, "Technical approach must be at least 10 characters"),
  trackType: z.nativeEnum(ProjectTrack, {
    errorMap: () => ({ message: "trackType must be ACADEMIC_RESEARCH, COMMERCIAL_VENTURE, or CIVIC_INITIATIVE" }),
  }),
  problemIds: z.array(z.string().uuid("Invalid problem UUID")).min(1, "Project must address at least one problem"),
  trackMetadata: z.record(z.any()).optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(ProjectStatus, {
    errorMap: () => ({ message: "Invalid project status" }),
  }),
});

const attachProblemSchema = z.object({
  problemId: z.string().uuid("Invalid problem UUID"),
  isPrimary: z.boolean().optional().default(false),
});

/**
 * POST /api/projects
 * Create a new V3 Project addressing one or more problems.
 * Accessible to institutional roles (UNIVERSITY, STARTUP, INDUSTRY, ADMIN).
 */
router.post(
  "/",
  authenticate,
  authorizeRoles(Role.UNIVERSITY, Role.STARTUP, Role.INDUSTRY, Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      if (!user.organizationId) {
        res.status(400).json({
          success: false,
          error: "User must belong to a registered Organization to lead a Project.",
        });
        return;
      }

      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { title, executiveSummary, technicalApproach, trackType, problemIds, trackMetadata } = parsed.data;

      // Verify all problem IDs exist
      const existingProblems = await prisma.problem.findMany({
        where: { id: { in: problemIds } },
        select: { id: true, title: true, district: true },
      });

      if (existingProblems.length !== problemIds.length) {
        res.status(404).json({
          success: false,
          error: "One or more specified problems do not exist.",
        });
        return;
      }

      // Create Project and Many-to-Many ProjectProblem associations in transaction
      const project = await prisma.$transaction(async (tx) => {
        const newProject = await tx.project.create({
          data: {
            title,
            executiveSummary,
            technicalApproach,
            trackType,
            status: ProjectStatus.PLANNING,
            leadOrgId: user.organizationId!,
            trackMetadata: trackMetadata || undefined,
            problems: {
              create: problemIds.map((probId, idx) => ({
                problemId: probId,
                isPrimary: idx === 0, // First specified is primary
              })),
            },
          },
          include: {
            leadOrg: {
              select: {
                id: true,
                name: true,
                type: true,
                district: true,
                domainTags: true,
              },
            },
            problems: {
              include: {
                problem: {
                  select: {
                    id: true,
                    title: true,
                    category: true,
                    district: true,
                    priorityTier: true,
                    priorityScore: true,
                    verificationStatus: true,
                  },
                },
              },
            },
          },
        });

        return newProject;
      });

      res.status(201).json({
        success: true,
        message: "Project created successfully",
        project,
      });
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create project",
      });
    }
  }
);

/**
 * GET /api/projects
 * List and filter projects.
 * Publicly viewable by any authenticated user.
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { problemId, trackType, status, district, leadOrgId, search, page = "1", limit = "20" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (problemId && typeof problemId === "string") {
      where.problems = {
        some: { problemId },
      };
    }

    if (trackType && Object.values(ProjectTrack).includes(trackType as ProjectTrack)) {
      where.trackType = trackType as ProjectTrack;
    }

    if (status && Object.values(ProjectStatus).includes(status as ProjectStatus)) {
      where.status = status as ProjectStatus;
    }

    if (leadOrgId && typeof leadOrgId === "string") {
      where.leadOrgId = leadOrgId;
    }

    if (district && typeof district === "string") {
      where.OR = [
        { leadOrg: { district: { contains: district, mode: "insensitive" } } },
        { problems: { some: { problem: { district: { contains: district, mode: "insensitive" } } } } },
      ];
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { executiveSummary: { contains: q, mode: "insensitive" } },
        { technicalApproach: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          leadOrg: {
            select: {
              id: true,
              name: true,
              type: true,
              district: true,
            },
          },
          problems: {
            include: {
              problem: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                  district: true,
                  priorityTier: true,
                  priorityScore: true,
                  verificationStatus: true,
                },
              },
            },
          },
          _count: {
            select: {
              milestones: true,
              needs: true,
              collaborations: true,
              pilots: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      projects,
    });
  } catch (error) {
    console.error("Error listing projects:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch projects",
    });
  }
});

/**
 * GET /api/projects/:id
 * Retrieve full project dossier with linked problems, milestones, needs, collaborations, and pilots.
 */
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        leadOrg: {
          select: {
            id: true,
            name: true,
            type: true,
            district: true,
            state: true,
            contactEmail: true,
            domainTags: true,
            expertiseTags: true,
          },
        },
        problems: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                description: true,
                category: true,
                subCategory: true,
                district: true,
                locationText: true,
                priorityScore: true,
                priorityTier: true,
                verificationStatus: true,
                status: true,
                evidenceUrl: true,
              },
            },
          },
        },
        milestones: {
          orderBy: { targetDate: "asc" },
          include: {
            verifiedByOrg: {
              select: { id: true, name: true, type: true },
            },
          },
        },
        needs: {
          orderBy: { createdAt: "desc" },
        },
        collaborations: {
          include: {
            providerOrg: {
              select: { id: true, name: true, type: true },
            },
            offer: {
              select: { id: true, title: true, category: true },
            },
          },
        },
        pilots: {
          include: {
            metrics: true,
            verifications: true,
          },
        },
        progressUpdates: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            postedBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: "Project not found",
      });
      return;
    }

    res.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch project details",
    });
  }
});

/**
 * PATCH /api/projects/:id/status
 * Transition Project status.
 * Restricted to Lead Organization members or Admin.
 */
router.patch("/:id/status", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid status parameter",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, leadOrgId: true, status: true },
    });

    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }

    // Permission check: Lead Org member or Admin
    const isLeadOrgMember = user.organizationId && user.organizationId === project.leadOrgId;
    const isAdmin = user.role === Role.ADMIN;

    if (!isLeadOrgMember && !isAdmin) {
      res.status(403).json({
        success: false,
        error: "Only members of the lead organization or administrators can update project status.",
      });
      return;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, title: true, status: true, updatedAt: true },
    });

    res.json({
      success: true,
      message: `Project status updated to ${updated.status}`,
      project: updated,
    });
  } catch (error) {
    console.error("Error updating project status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update project status",
    });
  }
});

/**
 * POST /api/projects/:id/problems
 * Attach an additional problem to a project (Many-to-Many clustering).
 * Lead Org member or Admin only.
 */
router.post("/:id/problems", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const parsed = attachProblemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, leadOrgId: true },
    });

    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }

    if (user.organizationId !== project.leadOrgId && user.role !== Role.ADMIN) {
      res.status(403).json({
        success: false,
        error: "Only members of the lead organization or administrators can attach problems.",
      });
      return;
    }

    const problem = await prisma.problem.findUnique({
      where: { id: parsed.data.problemId },
      select: { id: true, title: true },
    });

    if (!problem) {
      res.status(404).json({ success: false, error: "Problem to attach not found" });
      return;
    }

    // Check if already linked
    const existingLink = await prisma.projectProblem.findUnique({
      where: {
        projectId_problemId: {
          projectId: id,
          problemId: parsed.data.problemId,
        },
      },
    });

    if (existingLink) {
      res.status(409).json({
        success: false,
        error: "This problem is already linked to the project.",
      });
      return;
    }

    const link = await prisma.projectProblem.create({
      data: {
        projectId: id,
        problemId: parsed.data.problemId,
        isPrimary: parsed.data.isPrimary || false,
      },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            category: true,
            district: true,
            priorityTier: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Problem attached to project successfully",
      linkedProblem: link,
    });
  } catch (error) {
    console.error("Error attaching problem to project:", error);
    res.status(500).json({
      success: false,
      error: "Failed to attach problem to project",
    });
  }
});

/**
 * DELETE /api/projects/:id/problems/:problemId
 * Detach a problem from a project.
 * Lead Org member or Admin only. (Cannot detach if it's the only problem).
 */
router.delete("/:id/problems/:problemId", authenticate, async (req: Request, res: Response) => {
  try {
    const { id, problemId } = req.params;
    const user = req.user!;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        problems: true,
      },
    });

    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }

    if (user.organizationId !== project.leadOrgId && user.role !== Role.ADMIN) {
      res.status(403).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    if (project.problems.length <= 1) {
      res.status(400).json({
        success: false,
        error: "Cannot detach the only problem attached to this project. A project must address at least one problem.",
      });
      return;
    }

    await prisma.projectProblem.delete({
      where: {
        projectId_problemId: {
          projectId: id,
          problemId,
        },
      },
    });

    res.json({
      success: true,
      message: "Problem detached from project successfully",
    });
  } catch (error) {
    console.error("Error detaching problem from project:", error);
    res.status(500).json({
      success: false,
      error: "Failed to detach problem from project",
    });
  }
});

export default router;
