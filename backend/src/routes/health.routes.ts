import { Router, Request, Response } from "express";
import { HealthStatusResponse } from "../types/index.js";
import { config } from "../config/index.js";
import prisma from "../lib/prisma.js";

const router = Router();

/**
 * GET /api/health
 * Lightweight health check — includes DB connectivity status.
 */
router.get("/health", async (_req: Request, res: Response<HealthStatusResponse>) => {
  let dbStatus: "connected" | "disconnected" = "disconnected";
  let dbLatencyMs: number | null = null;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }

  const isHealthy = dbStatus === "connected";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    service: "civicbridge-backend",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
  });
});

export default router;
