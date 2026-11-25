import request from "supertest";
import { createApp } from "../src/app.js";
import { createDb } from "../src/db/index.js";
import type { Email, Mailer } from "../src/mail/mailer.js";
import type { Deps } from "../src/services/context.js";

/** Captures emails in memory so tests can read the links inside them. */
export class TestMailer implements Mailer {
  readonly mode = "smtp" as const;
  sent: Email[] = [];
  async send(email: Email) {
    this.sent.push(email);
  }
  last(to?: string) {
    const list = to ? this.sent.filter((e) => e.to === to) : this.sent;
    return list[list.length - 1];
  }
  /** First link in the email that points at the given path, e.g. "/setup". */
  link(email: Email, path: string) {
    const m = email.text.match(new RegExp(`https?://[^\\s]+${path.replace(/\//g, "\\/")}[^\\s]*`));
    if (!m) throw new Error(`No ${path} link in "${email.subject}"`);
    return new URL(m[0]);
  }
}

export async function setup(opts: { rateMax?: number } = {}) {
  const db = await createDb({ databaseUrl: "", pgliteDir: "memory://" });
  const mailer = new TestMailer();
  const clock = { now: new Date("2026-03-02T09:00:00Z") };
  const deps: Deps = { db, mailer, appUrl: "http://app.test", now: () => new Date(clock.now) };
  const app = createApp({
    deps,
    corsOrigins: ["http://app.test"],
    isProd: false,
    rateLimit: { windowMs: 60_000, max: opts.rateMax ?? 1000 },
  });
  return { app, db, mailer, clock, deps };
}

export type Ctx = Awaited<ReturnType<typeof setup>>;

export const waitlistEntry = (over: Record<string, unknown> = {}) => ({
  name: "Mari Tamm",
  email: "mari@foodbank.example",
  organisation: "Harbour Food Bank",
  orgType: "charity",
  volunteerCount: "26-100",
  consent: true,
  ...over,
});

/** Joins the waitlist, follows the email link and creates the organisation. Returns a logged-in agent. */
export async function createOrg(ctx: Ctx, email = "mari@foodbank.example", organisation = "Harbour Food Bank") {
  await request(ctx.app).post("/api/waitlist").send(waitlistEntry({ email, organisation })).expect(201);
  const token = ctx.mailer.link(ctx.mailer.last(email), "/setup").searchParams.get("token")!;
  const agent = request.agent(ctx.app);
  await agent.post("/api/auth/setup").send({ token, name: "Mari Tamm", organisation, password: "correct-horse-1" }).expect(201);
  const me = (await agent.get("/api/auth/me").expect(200)).body;
  return { agent, me };
}

export const iso = (d: Date) => d.toISOString();
export const hoursFrom = (base: Date, h: number) => new Date(base.getTime() + h * 3_600_000);
