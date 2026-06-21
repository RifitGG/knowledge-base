import { triggerLiveRefresh } from "../utils/liveRefresh";

const TOKEN_KEY = "knowbase.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export interface RequestOptions extends RequestInit {
  json?: unknown;
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = (opts.method || "GET").toUpperCase();
  const headers = new Headers(opts.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = opts.body;
  if (opts.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.json);
  }
  const res = await fetch(path, { ...opts, headers, body });
  if (!res.ok) {
    let detail: string = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      
    }
    throw new Error(detail);
  }
  if (res.status === 204) {
    if (method !== "GET") {
      triggerLiveRefresh();
    }
    return undefined as T;
  }
  const data = (await res.json()) as T;
  if (method !== "GET") {
    triggerLiveRefresh();
  }
  return data;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, json?: unknown) => apiFetch<T>(path, { method: "POST", json }),
  put: <T>(path: string, json?: unknown) => apiFetch<T>(path, { method: "PUT", json }),
  del: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
