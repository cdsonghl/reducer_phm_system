const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:8000/api";

function deriveAuthBaseUrl(apiBaseUrl: string): string {
  const explicit = (import.meta.env.VITE_AUTH_BASE_URL as string | undefined)?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (apiBaseUrl.endsWith("/api")) {
    return apiBaseUrl.slice(0, -4);
  }
  return apiBaseUrl;
}

export const API_BASE_URL = RAW_API_BASE_URL;
export const AUTH_BASE_URL = deriveAuthBaseUrl(RAW_API_BASE_URL);
