import { Router, Request, Response } from "express";
import { FilterStatus, OrganizationType } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * GET /api/discovery
 * Universal cross-stakeholder discovery endpoint.
 * Returns coordinated search results across Problems, Projects, Offers, Needs, and Organizations.
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { q, district, category, limit = "10" } = req.query;

    const limitNum = Math.min(25, Math.max(1, parseInt(limit as string, 10) || 10));
    const queryStr = typeof q === "string" && q.trim() ? q.trim() : undefined;
    const districtStr = typeof district === "string" && district.trim() ? district.trim() : undefined;
    const categoryStr = typeof category === "string" && category.trim() ? category.trim() : undefined;

    // 1. Problem filters (only PASSED filterStatus are visible)
    const problemWhere: any = {
      filterStatus: FilterStatus.PASSED,
    };
    if (districtStr) {
      problemWhere.district = { contains: districtStr, mode: "insensitive" };
    }
    if (categoryStr) {
      problemWhere.category = { contains: categoryStr, mode: "insensitive" };
    }
    if (queryStr) {
      problemWhere.OR = [
        { title: { contains: queryStr, mode: "insensitive" } },
        { description: { contains: queryStr, mode: "insensitive" } },
        { district: { contains: queryStr, mode: "insensitive" } },
        { category: { contains: queryStr, mode: "insensitive" } },
      ];
    }

    // 2. Project filters
    const projectWhere: any = {};
    if (queryStr) {
      projectWhere.OR = [
        { title: { contains: queryStr, mode: "insensitive" } },
        { executiveSummary: { contains: queryStr, mode: "insensitive" } },
        { technicalApproach: { contains: queryStr, mode: "insensitive" } },
        { leadOrg: { district: { contains: queryStr, mode: "insensitive" } } },
        { problems: { some: { problem: { district: { contains: queryStr, mode: "insensitive" } } } } },
        { problems: { some: { problem: { title: { contains: queryStr, mode: "insensitive" } } } } },
      ];
    }
    if (districtStr) {
      projectWhere.OR = [
        ...(projectWhere.OR || []),
        { leadOrg: { district: { contains: districtStr, mode: "insensitive" } } },
        { problems: { some: { problem: { district: { contains: districtStr, mode: "insensitive" } } } } },
      ];
    }

    // 3. Offer filters (only ACTIVE)
    const offerWhere: any = { status: "ACTIVE" };
    if (districtStr) {
      offerWhere.district = { contains: districtStr, mode: "insensitive" };
    }
    if (queryStr) {
      offerWhere.OR = [
        { title: { contains: queryStr, mode: "insensitive" } },
        { specifications: { contains: queryStr, mode: "insensitive" } },
        { district: { contains: queryStr, mode: "insensitive" } },
      ];
    }

    // 4. Need filters (only OPEN)
    const needWhere: any = { status: "OPEN" };
    if (districtStr) {
      needWhere.district = { contains: districtStr, mode: "insensitive" };
    }
    if (queryStr) {
      needWhere.OR = [
        { title: { contains: queryStr, mode: "insensitive" } },
        { details: { contains: queryStr, mode: "insensitive" } },
        { district: { contains: queryStr, mode: "insensitive" } },
      ];
    }

    // 5. Organization filters
    const orgWhere: any = {};
    if (districtStr) {
      orgWhere.district = { contains: districtStr, mode: "insensitive" };
    }
    if (queryStr) {
      orgWhere.OR = [
        { name: { contains: queryStr, mode: "insensitive" } },
        { district: { contains: queryStr, mode: "insensitive" } },
        { domainTags: { hasSome: [queryStr] } },
        { expertiseTags: { hasSome: [queryStr] } },
      ];
    }

    // Parallel fetch across all 5 discovery indexes
    const [problems, projects, offers, needs, organizations, problemCount, projectCount, offerCount, needCount, orgCount] =
      await Promise.all([
        prisma.problem.findMany({
          where: problemWhere,
          take: limitNum,
          orderBy: { priorityScore: "desc" },
          select: {
            id: true,
            title: true,
            category: true,
            subCategory: true,
            district: true,
            priorityTier: true,
            priorityScore: true,
            verificationStatus: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.project.findMany({
          where: projectWhere,
          take: limitNum,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            trackType: true,
            status: true,
            leadOrg: {
              select: { id: true, name: true, type: true, district: true },
            },
            problems: {
              select: {
                problem: {
                  select: { id: true, title: true, district: true },
                },
              },
            },
          },
        }),
        prisma.offer.findMany({
          where: offerWhere,
          take: limitNum,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            category: true,
            title: true,
            district: true,
            capacityTerms: true,
            providerOrg: {
              select: { id: true, name: true, type: true, district: true },
            },
          },
        }),
        prisma.need.findMany({
          where: needWhere,
          take: limitNum,
          orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            category: true,
            title: true,
            urgency: true,
            district: true,
            creatorOrg: {
              select: { id: true, name: true, type: true, district: true },
            },
            project: {
              select: { id: true, title: true, trackType: true },
            },
          },
        }),
        prisma.organization.findMany({
          where: orgWhere,
          take: limitNum,
          select: {
            id: true,
            name: true,
            type: true,
            district: true,
            domainTags: true,
            expertiseTags: true,
          },
        }),
        prisma.problem.count({ where: problemWhere }),
        prisma.project.count({ where: projectWhere }),
        prisma.offer.count({ where: offerWhere }),
        prisma.need.count({ where: needWhere }),
        prisma.organization.count({ where: orgWhere }),
      ]);

    res.json({
      success: true,
      query: { q: queryStr, district: districtStr, category: categoryStr },
      summaryCounts: {
        problems: problemCount,
        projects: projectCount,
        offers: offerCount,
        needs: needCount,
        organizations: orgCount,
      },
      results: {
        problems,
        projects,
        offers,
        needs,
        organizations,
      },
    });
  } catch (error) {
    console.error("Error performing universal discovery search:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform discovery search",
    });
  }
});

/**
 * GET /api/discovery/organizations
 * Directory of registered Organizations with capability and project activity counts.
 */
router.get("/organizations", authenticate, async (req: Request, res: Response) => {
  try {
    const { type, district, domainTag, search, page = "1", limit = "20" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (type && Object.values(OrganizationType).includes(type as OrganizationType)) {
      where.type = type as OrganizationType;
    }

    if (district && typeof district === "string") {
      where.district = { contains: district, mode: "insensitive" };
    }

    if (domainTag && typeof domainTag === "string") {
      where.domainTags = { has: domainTag };
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { domainTags: { hasSome: [q] } },
        { expertiseTags: { hasSome: [q] } },
      ];
    }

    const [total, organizations] = await Promise.all([
      prisma.organization.count({ where }),
      prisma.organization.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          district: true,
          state: true,
          domainTags: true,
          expertiseTags: true,
          contactEmail: true,
          _count: {
            select: {
              projects: true,
              offers: true,
              needs: true,
              users: true,
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
      organizations,
    });
  } catch (error) {
    console.error("Error listing organizations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch organizations directory",
    });
  }
});

/**
 * GET /api/discovery/organizations/:id
 * Retrieve public institutional profile with active initiatives.
 */
router.get("/organizations/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            id: true,
            title: true,
            trackType: true,
            status: true,
            createdAt: true,
          },
        },
        offers: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            category: true,
            title: true,
            district: true,
          },
        },
        needs: {
          where: { status: "OPEN" },
          select: {
            id: true,
            category: true,
            title: true,
            urgency: true,
          },
        },
        _count: {
          select: {
            users: true,
            projects: true,
            offers: true,
            needs: true,
          },
        },
      },
    });

    if (!organization) {
      res.status(404).json({ success: false, error: "Organization not found" });
      return;
    }

    res.json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error("Error fetching organization profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch organization profile",
    });
  }
});

export default router;
