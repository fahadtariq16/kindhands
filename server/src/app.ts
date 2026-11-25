import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { apiRouter } from "./routes/index.js";
import { devRouter } from "./routes/dev.js";
import { loadUser } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import type { Deps } from "./services/context.js";

export interface AppOptions {
  deps: Deps;
  corsOrigins: string[];
  isProd: boolean;
  rateLimit: { windowMs: number; max: number };
  /** false, or the number of proxies in front of the app (needed for correct client IPs in rate limiting). */
  trustProxy?: false | number;
}

/** Builds the Express app. Kept separate from index.ts so tests can create it without opening a port. */
export function createApp(opts: AppOptions) {
  const app = express();

  // Behind Render/Fly/Nginx the client IP comes from X-Forwarded-For; needed for rate limiting.
  if (opts.trustProxy) app.set("trust proxy", opts.trustProxy);

  app.use(helmet());
  app.use(cors({ origin: opts.corsOrigins, credentials: true, methods: ["GET", "POST", "PUT", "DELETE"] }));
  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());
  app.use(loadUser(opts.deps));

  app.use("/api", apiRouter({ deps: opts.deps, isProd: opts.isProd, rateLimit: opts.rateLimit }));

  if (opts.deps.mailer.mode === "outbox" && !opts.isProd) {
    app.use("/api/dev", devRouter(opts.deps.db));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
