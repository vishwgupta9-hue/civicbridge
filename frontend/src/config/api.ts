/**
 * Resolves the CivicBridge API base URL.
 *
 * Supports:
 * - Local development default: http://localhost:5000/api
 * - Vite environment variable: VITE_API_URL
 * - Flexible formatting for production deployments (e.g. Vercel -> Render):
 *   Accepts either "https://civicbridge-6602.onrender.com" or "https://civicbridge-6602.onrender.com/api"
 *   with or without trailing slashes.
 */
export function resolveApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || typeof envUrl !== "string" || !envUrl.trim()) {
    return "http://localhost:5000/api";
  }

  const trimmed = envUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed;
  }
  return `${trimmed}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();
export default API_BASE_URL;
