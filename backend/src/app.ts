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
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
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
app.use("/api/auth", authRouter);
app.use("/api/problems", problemRouter);
app.use("/api/admin", adminRouter);
app.use("/api", institutionalRouter);

// Global error handler
app.use(errorHandler);

export default app;
