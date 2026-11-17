import { API_URL } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

const TOKEN_KEY = "stewra.session";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — session lasts for this tab only */
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token && init.auth !== false) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1${path}`, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Cannot reach the Stewra API. Check your connection and try again.");
  }
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text.slice(0, 200) };
  }
  if (!res.ok) throw new ApiError(res.status, (data.message as string) ?? `Request failed (${res.status})`, data.error as string);
  return data as T;
}

export const streamUrl = (orgId: string) => `${API_URL}/v1/orgs/${orgId}/stream?token=${encodeURIComponent(getToken() ?? "")}`;
