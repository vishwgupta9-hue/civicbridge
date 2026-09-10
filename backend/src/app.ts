import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/index.js";
import healthRouter from "./routes/health.routes.js";
import authRouter from "./routes/auth.routes.js";
import problemRouter from "./routes/problem.routes.js";
import adminRouter from "./routes/admin.routes.js";
import institutionalRouter from "./routes/institutional.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app: Express = express();

// Security and utility middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Determine allowed origins dynamically for local dev, Vercel deployments, and configured FRONTEND_URL
const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Non-browser / health-check / mobile clients

  // Local development
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
  ) {
    return true;
  }

  // Any Vercel deployment (production, preview, branch)
  if (
    origin.endsWith(".vercel.app") ||
    /^https:\/\/.*\.vercel\.app$/.test(origin)
  ) {
    return true;
  }

  // Explicitly configured FRONTEND_URL (supports comma-separated list)
  const configured = config.frontendUrl
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  if (configured.includes(origin) || configured.includes("*")) {
    return true;
  }

  return false;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health and info route
app.get("/", (_req, res) => {
  res.json({
    name: "CivicBridge API",
    version: "1.0.0",
    description: "SIH PS 26043 - Community Problem-Solving Platform for Jharkhand",
    status: "online",
  });
});

import uploadRouter from "./routes/upload.routes.js";
import universityRouter from "./routes/university.routes.js";
import startupRouter from "./routes/startup.routes.js";
import industryRouter from "./routes/industry.routes.js";
import projectRouter from "./routes/project.routes.js";
import exchangeRouter from "./routes/exchange.routes.js";
import discoveryRouter from "./routes/discovery.routes.js";
import collaborationRouter from "./routes/collaboration.routes.js";
import milestoneRouter from "./routes/milestone.routes.js";
import progressRouter from "./routes/progress.routes.js";
import pilotRouter from "./routes/pilot.routes.js";
import socialRouter from "./routes/social.routes.js";
import path from "path";

// Static uploads serving (with cross-origin headers)
const uploadsPath = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsPath));
app.use("/api/uploads", express.static(uploadsPath));

// API Routes
app.use("/api", healthRouter);
app.use("/", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/problems", problemRouter);
app.use("/api/admin", adminRouter);
app.use("/api/university", universityRouter);
app.use("/api/startup", startupRouter);
app.use("/api/industry", industryRouter);
app.use("/api", institutionalRouter);

// V3 Core API Routes
app.use("/api/projects", projectRouter);
app.use("/api", exchangeRouter);
app.use("/api/discovery", discoveryRouter);
app.use("/api/collaborations", collaborationRouter);
app.use("/api/milestones", milestoneRouter);
app.use("/api/progress-updates", progressRouter);
app.use("/api/pilots", pilotRouter);

// Civic Social Platform Routes
app.use("/api/social", socialRouter);
app.use("/api/citizen", socialRouter);
app.use("/api", socialRouter);

// Catch-all 404 for unhandled API routes (ensures JSON response instead of default Express HTML)
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use(errorHandler);

export default app;
