import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "dev_secret_key_sih2026",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  mockAi: process.env.MOCK_AI === "true",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
};
