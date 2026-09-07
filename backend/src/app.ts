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

// API Routes
app.use("/api", healthRouter);
app.use("/", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/problems", problemRouter);
app.use("/api/admin", adminRouter);
app.use("/api", institutionalRouter);

// Global error handler
app.use(errorHandler);

export default app;
