import type { ApiError, FieldErrors } from "@kindhands/shared";

const BASE = import.meta.env.VITE_API_URL ?? "";

/** Error thrown by api() for any non-2xx response or network failure. */
export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: FieldErrors = {},
  ) {
    super(message);
  }
}

/** Small fetch wrapper: JSON in/out, cookies included, friendly errors. */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      credentials: "include",
      headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiRequestError(0, "Can't reach the server. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => ({}))) as T & Partial<ApiError>;
  if (!res.ok) {
    throw new ApiRequestError(res.status, data.error ?? "Something went wrong. Please try again.", data.fields ?? {});
  }
  return data;
}

export const apiUrl = (path: string) => `${BASE}/api${path}`;
