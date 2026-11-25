import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  acceptInviteSchema,
  loginSchema,
  orgSettingsSchema,
  setupSchema,
  shiftSchema,
  shiftUpdateSchema,
  teamInviteSchema,
  volunteerSignupSchema,
  waitlistSchema,
  type WaitlistSuccess,
} from "@kindhands/shared";
import { validateBody } from "../middleware/validate.js";
import { requireAdmin, requireAuth, SESSION_COOKIE, setSessionCookie } from "../middleware/auth.js";
import { idParam } from "../lib/http.js";
import * as auth from "../services/auth.js";
import * as shifts from "../services/shifts.js";
import * as people from "../services/people.js";
import { joinWaitlist } from "../services/waitlist.js";
import type { Deps } from "../services/context.js";

interface Options {
  deps: Deps;
  isProd: boolean;
  rateLimit: { windowMs: number; max: number };
}

export function apiRouter({ deps, isProd, rateLimit: rl }: Options) {
  const r = Router();
  const limiter = (max = rl.max) =>
    rateLimit({
      windowMs: rl.windowMs,
      limit: max,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "Too many attempts. Please try again later." },
    });

  r.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  /* ------------------------------ Waitlist ------------------------------ */

  r.post("/waitlist", limiter(), validateBody(waitlistSchema), async (req, res) => {
    const result = await joinWaitlist(deps, req.body);
    // Same reply for new, duplicate and bot sign-ups, so the form can't be used to check who is registered.
    const body: WaitlistSuccess = { message: "You're on the list! Check your inbox for a link to set up your organisation." };
    res.status(result === "joined" ? 201 : 200).json(body);
  });

  /* ------------------------------ Auth ------------------------------ */

  // Returns null (not 401) when logged out, so public pages don't log errors in the browser console.
  r.get("/auth/me", (req, res) => {
    res.json(req.me ?? null);
  });

  r.post("/auth/login", limiter(), validateBody(loginSchema), async (req, res) => {
    const session = await auth.login(deps, req.body);
    setSessionCookie(res, session.id, isProd);
    res.json({ ok: true });
  });

  r.post("/auth/logout", async (req, res) => {
    const sid = req.cookies?.[SESSION_COOKIE];
    if (sid) await auth.deleteSession(deps, sid);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  r.get("/auth/invites/:token", async (req, res) => {
    res.json(await auth.getInviteInfo(deps, String(req.params.token)));
  });

  r.post("/auth/setup", limiter(), validateBody(setupSchema), async (req, res) => {
    const session = await auth.completeOrgSetup(deps, req.body);
    setSessionCookie(res, session.id, isProd);
    res.status(201).json({ ok: true });
  });

  r.post("/auth/accept-invite", limiter(), validateBody(acceptInviteSchema), async (req, res) => {
    const session = await auth.acceptTeamInvite(deps, req.body);
    setSessionCookie(res, session.id, isProd);
    res.json({ ok: true });
  });

  /* ------------------------------ Public: volunteers ------------------------------ */

  r.get("/public/orgs/:slug", async (req, res) => {
    const { org, shifts: list } = await shifts.publicOrg(deps, String(req.params.slug));
    res.json({ name: org.name, slug: org.slug, timezone: org.timezone, shifts: list });
  });

  r.post(
    "/public/orgs/:slug/shifts/:shiftId/signup",
    limiter(20),
    validateBody(volunteerSignupSchema),
    async (req, res) => {
      const result = await shifts.publicSignUp(deps, String(req.params.slug), idParam(req.params.shiftId), req.body);
      res.status(result.status === "booked" ? 201 : 200).json(result);
    },
  );

  r.get("/public/signups/:token", async (req, res) => {
    res.json(await shifts.getManagedSignup(deps, String(req.params.token)));
  });

  r.post("/public/signups/:token/cancel", limiter(20), async (req, res) => {
    await shifts.cancelByToken(deps, String(req.params.token));
    res.json({ ok: true });
  });

  /* ------------------------------ Dashboard (signed in) ------------------------------ */

  r.get("/dashboard", requireAuth, async (req, res) => {
    res.json(await people.dashboard(deps, req.me!.org.id, req.me!.org.timezone));
  });

  r.get("/shifts", requireAuth, async (req, res) => {
    const range = req.query.range === "past" ? "past" : "upcoming";
    res.json(await shifts.listShifts(deps, req.me!.org.id, range));
  });

  r.post("/shifts", requireAuth, validateBody(shiftSchema), async (req, res) => {
    res.status(201).json(await shifts.createShifts(deps, req.me!.org.id, req.body));
  });

  r.get("/shifts/:id", requireAuth, async (req, res) => {
    res.json(await shifts.getShift(deps, req.me!.org.id, idParam(req.params.id)));
  });

  r.put("/shifts/:id", requireAuth, validateBody(shiftUpdateSchema), async (req, res) => {
    await shifts.updateShift(deps, req.me!.org.id, idParam(req.params.id), req.body);
    res.json(await shifts.getShift(deps, req.me!.org.id, idParam(req.params.id)));
  });

  r.delete("/shifts/:id", requireAuth, async (req, res) => {
    res.json(await shifts.deleteShift(deps, req.me!.org.id, idParam(req.params.id), req.query.series === "true"));
  });

  r.post("/shifts/:id/signups", requireAuth, validateBody(volunteerSignupSchema), async (req, res) => {
    const result = await shifts.signUp(deps, req.me!.org.id, idParam(req.params.id), req.body);
    res.status(result.status === "booked" ? 201 : 200).json({ status: result.status });
  });

  r.post("/shifts/:id/signups/:signupId/check-in", requireAuth, async (req, res) => {
    const checkedIn = req.body?.checkedIn !== false;
    await shifts.setCheckIn(deps, req.me!.org.id, idParam(req.params.id), idParam(req.params.signupId), checkedIn);
    res.json({ ok: true });
  });

  r.delete("/shifts/:id/signups/:signupId", requireAuth, async (req, res) => {
    await shifts.removeSignup(deps, req.me!.org.id, idParam(req.params.id), idParam(req.params.signupId));
    res.json({ ok: true });
  });

  /* ------------------------------ Volunteers ------------------------------ */

  r.get("/volunteers", requireAuth, async (req, res) => {
    res.json(await people.listVolunteers(deps, req.me!.org.id));
  });

  r.get("/volunteers/export.csv", requireAuth, async (req, res) => {
    const csv = await people.volunteersCsv(deps, req.me!.org.id);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${req.me!.org.slug}-volunteers.csv"`);
    res.send("﻿" + csv); // BOM so Excel reads UTF-8 names correctly
  });

  r.delete("/volunteers/:id", requireAdmin, async (req, res) => {
    await people.deleteVolunteer(deps, req.me!.org.id, idParam(req.params.id));
    res.json({ ok: true });
  });

  /* ------------------------------ Team & organisation ------------------------------ */

  r.get("/team", requireAuth, async (req, res) => {
    res.json(await people.listTeam(deps, req.me!.org.id));
  });

  r.post("/team/invites", requireAdmin, validateBody(teamInviteSchema), async (req, res) => {
    await people.inviteToTeam(deps, req.me!.org, req.me!.user.name, req.body.email, req.body.role);
    res.status(201).json({ ok: true });
  });

  r.delete("/team/members/:userId", requireAdmin, async (req, res) => {
    await people.removeMember(deps, req.me!.org.id, req.me!.user.id, idParam(req.params.userId));
    res.json({ ok: true });
  });

  r.put("/org", requireAdmin, validateBody(orgSettingsSchema), async (req, res) => {
    await people.updateOrg(deps, req.me!.org.id, req.body);
    res.json({ ok: true });
  });

  return r;
}
