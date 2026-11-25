import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { toFieldErrors, type ApiError } from "@kindhands/shared";

/** Validates req.body against a zod schema and replaces it with the parsed (trimmed, normalised) value. */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const body: ApiError = { error: "Please check the highlighted fields.", fields: toFieldErrors(result.error) };
      res.status(400).json(body);
      return;
    }
    req.body = result.data;
    next();
  };
}
