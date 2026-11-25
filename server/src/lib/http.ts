import type { FieldErrors } from "@kindhands/shared";

/** Throw this from any route or service to send a clean JSON error. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: FieldErrors,
  ) {
    super(message);
  }
}

export const notFound = (what = "Not found") => new HttpError(404, what);
export const forbidden = (msg = "You don't have permission to do that") => new HttpError(403, msg);
export const conflict = (msg: string, fields?: FieldErrors) => new HttpError(409, msg, fields);
export const badRequest = (msg: string, fields?: FieldErrors) => new HttpError(400, msg, fields);

/** Parse a route param as a positive integer id, or 404. */
export function idParam(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw notFound();
  return n;
}
