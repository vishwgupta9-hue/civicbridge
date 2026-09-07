import app from "./app.js";
import { config } from "./config/index.js";
import prisma from "./lib/prisma.js";

const server = app.listen(config.port, () => {
  console.log(`[CivicBridge] Server is running on port ${config.port} in ${config.nodeEnv} mode`);
});

const handleGracefulShutdown = async (signal: string) => {
  console.log(`[CivicBridge] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log("[CivicBridge] HTTP server closed.");
    await prisma.$disconnect();
    console.log("[CivicBridge] Database connection closed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
