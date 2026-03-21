import { AUTH_BASE_URL } from "./apiConfig";

type TokenPair = {
  access: string;
  refresh: string;
};

export type AuthUser = {
  id: number;
  username: string;
  is_superuser: boolean;
  is_staff: boolean;
};

const TOKEN_STORAGE_KEY = "phm_auth_tokens";
export const AUTH_REQUIRED_EVENT = "phm:auth-required";
let authRequiredRaised = false;

function readTokens(): TokenPair | null {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TokenPair;
  } catch {
    return null;
  }
}

function saveTokens(tokens: TokenPair) {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  authRequiredRaised = false;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  authRequiredRaised = false;
}

export function getAccessToken() {
  return readTokens()?.access ?? null;
}

function getRefreshToken() {
  return readTokens()?.refresh ?? null;
}

export async function login(username: string, password: string): Promise<TokenPair> {
  const response = await fetch(`${AUTH_BASE_URL}/api/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error("用户名或密码错误");
  }
  const tokens = (await response.json()) as TokenPair;
  saveTokens(tokens);
  return tokens;
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const response = await fetch(`${AUTH_BASE_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) {
    clearAuth();
    return null;
  }
  const payload = (await response.json()) as { access: string };
  const current = readTokens();
  if (current) {
    saveTokens({ access: payload.access, refresh: current.refresh });
  }
  return payload.access;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const access = getAccessToken();
  if (!access) return null;
  const response = await fetch(`${AUTH_BASE_URL}/api/auth/me/`, {
    headers: {
      Authorization: `Bearer ${access}`,
    },
  });
  if (!response.ok) return null;
  return (await response.json()) as AuthUser;
}

export function notifyAuthRequired() {
  if (authRequiredRaised) return;
  authRequiredRaised = true;
  window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
}
