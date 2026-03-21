import { API_BASE_URL } from "./apiConfig";
import { clearAuth, getAccessToken, notifyAuthRequired, refreshAccessToken } from "./auth";

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined) {
        params.set(k, String(v));
      }
    });
  }

  if (/^https?:\/\//.test(API_BASE_URL)) {
    const url = new URL(`${API_BASE_URL}${normalizedPath}`);
    params.forEach((v, k) => url.searchParams.set(k, v));
    return url.toString();
  }

  const queryString = params.toString();
  return `${API_BASE_URL}${normalizedPath}${queryString ? `?${queryString}` : ""}`;
}

export async function apiRequest<T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
  }
): Promise<T> {
  const execute = async (token?: string | null) =>
    fetch(buildUrl(path, options?.query), {
      method: options?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options?.body === undefined ? undefined : JSON.stringify(options.body),
    });

  let response = await execute(getAccessToken());
  if (response.status === 401) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      response = await execute(newAccess);
    } else {
      clearAuth();
      notifyAuthRequired();
      throw new Error("登录状态已失效，请重新登录");
    }
  }

  if (response.status === 401) {
    clearAuth();
    notifyAuthRequired();
    throw new Error("登录状态已失效，请重新登录");
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : (payload as { detail?: string }).detail ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export { API_BASE_URL };
