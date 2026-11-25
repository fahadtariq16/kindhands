import type { CookieOptions, RequestHandler, Response } from "express";
import type { Me } from "@kindhands/shared";
import { getSessionUser, SESSION_DAYS } from "../services/auth.js";
import type { Deps } from "../services/context.js";
import { forbidden, HttpError } from "../lib/http.js";

export const SESSION_COOKIE = "kh_session";

declare module "express-serve-static-core" {
  interface Request {
    me?: Me;
  }
}

export function cookieOptions(isProd: boolean): CookieOptions {
  return {
    httpOnly: true, // not readable from JavaScript → safe from XSS token theft
    sameSite: "lax", // not sent on cross-site POSTs → basic CSRF protection
    secure: isProd, // HTTPS only in production
    path: "/",
    maxAge: SESSION_DAYS * 86_400_000,
  };
}

export function setSessionCookie(res: Response, id: string, isProd: boolean) {
  res.cookie(SESSION_COOKIE, id, cookieOptions(isProd));
}

/** Loads the signed-in user (if any) onto req.me. */
export function loadUser(deps: Deps): RequestHandler {
  return async (req, _res, next) => {
    const sid = req.cookies?.[SESSION_COOKIE];
    if (typeof sid === "string" && sid) req.me = (await getSessionUser(deps, sid)) ?? undefined;
    next();
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.me) throw new HttpError(401, "Please log in");
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.me) throw new HttpError(401, "Please log in");
  if (req.me.role !== "admin") throw forbidden("Only admins can do this");
  next();
};
