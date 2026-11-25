import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ApiError } from "@kindhands/shared";
import { HttpError } from "../lib/http.js";

export const notFound: RequestHandler = (_req, res) => {
  const body: ApiError = { error: "Not found" };
  res.status(404).json(body);
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    const body: ApiError = { error: err.message, ...(err.fields ? { fields: err.fields } : {}) };
    res.status(err.status).json(body);
    return;
  }
  // Malformed JSON from express.json()
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body" } satisfies ApiError);
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "Request is too large" } satisfies ApiError);
    return;
  }
  console.error("[error]", err);
  res.status(500).json({ error: "Something went wrong. Please try again." } satisfies ApiError);
};
