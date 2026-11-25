import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { sendDueReminders } from "../src/jobs/reminders.js";
import { createOrg, hoursFrom, iso, setup, waitlistEntry, type Ctx } from "./helpers.js";

let ctx: Ctx;
beforeEach(async () => {
  ctx = await setup();
});

const newShift = (base: Date, over: Record<string, unknown> = {}) => ({
  title: "Food sorting",
  location: "Warehouse",
  startsAt: iso(hoursFrom(base, 48)),
  endsAt: iso(hoursFrom(base, 51)),
  spots: 2,
  ...over,
});

describe("health and basics", () => {
  it("returns ok with security headers", async () => {
    const res = await request(ctx.app).get("/api/health").expect(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await request(ctx.app).post("/api/waitlist").set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
  });
});

describe("waitlist → email → organisation setup", () => {
  it("emails a setup link when someone joins", async () => {
    const res = await request(ctx.app).post("/api/waitlist").send(waitlistEntry()).expect(201);
    expect(res.body.message).toMatch(/inbox/i);
    const mail = ctx.mailer.last("mari@foodbank.example");
    expect(mail.subject).toContain("Harbour Food Bank");
    expect(ctx.mailer.link(mail, "/setup").searchParams.get("token")).toBeTruthy();
  });

  it("gives the same reply for duplicates and stores the email normalised", async () => {
    const a = await request(ctx.app).post("/api/waitlist").send(waitlistEntry({ email: " Mari@FoodBank.example " }));
    const b = await request(ctx.app).post("/api/waitlist").send(waitlistEntry());
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.message).toBe(a.body.message);
    const rows = await ctx.db.query("SELECT * FROM waitlist");
    expect(rows).toHaveLength(1);
  });

  it("ignores bots that fill the honeypot", async () => {
    await request(ctx.app).post("/api/waitlist").send(waitlistEntry({ website: "spam" })).expect(200);
    expect(ctx.mailer.sent).toHaveLength(0);
    expect(await ctx.db.query("SELECT * FROM waitlist")).toHaveLength(0);
  });

  it("validates fields", async () => {
    const res = await request(ctx.app).post("/api/waitlist").send(waitlistEntry({ email: "nope", consent: false }));
    expect(res.status).toBe(400);
    expect(res.body.fields.email).toBeDefined();
    expect(res.body.fields.consent).toBeDefined();
  });

  it("creates the organisation and logs the admin in from the email link", async () => {
    const { me } = await createOrg(ctx);
    expect(me.role).toBe("admin");
    expect(me.org.name).toBe("Harbour Food Bank");
    expect(me.org.slug).toBe("harbour-food-bank");
  });

  it("does not let a setup link be used twice", async () => {
    await request(ctx.app).post("/api/waitlist").send(waitlistEntry());
    const token = ctx.mailer.link(ctx.mailer.last(), "/setup").searchParams.get("token")!;
    const body = { token, name: "Mari", organisation: "Harbour Food Bank", password: "correct-horse-1" };
    await request(ctx.app).post("/api/auth/setup").send(body).expect(201);
    const again = await request(ctx.app).post("/api/auth/setup").send(body);
    expect(again.status).toBe(410);
  });

  it("rejects expired setup links", async () => {
    await request(ctx.app).post("/api/waitlist").send(waitlistEntry());
    const token = ctx.mailer.link(ctx.mailer.last(), "/setup").searchParams.get("token")!;
    ctx.clock.now = hoursFrom(ctx.clock.now, 15 * 24);
    const res = await request(ctx.app).get(`/api/auth/invites/${token}`);
    expect(res.status).toBe(410);
  });

  it("gives organisations with the same name different links", async () => {
    await createOrg(ctx, "a@x.example", "Food Bank");
    const { me } = await createOrg(ctx, "b@x.example", "Food Bank");
    expect(me.org.slug).toBe("food-bank-2");
  });
});

describe("login and access control", () => {
  it("logs in with the right password only", async () => {
    await createOrg(ctx);
    await request(ctx.app).post("/api/auth/login").send({ email: "mari@foodbank.example", password: "wrong" }).expect(401);
    const agent = request.agent(ctx.app);
    await agent.post("/api/auth/login").send({ email: "MARI@foodbank.example", password: "correct-horse-1" }).expect(200);
    await agent.get("/api/dashboard").expect(200);
    await agent.post("/api/auth/logout").expect(200);
    await agent.get("/api/dashboard").expect(401);
  });

  it("protects dashboard routes", async () => {
    for (const path of ["/api/dashboard", "/api/shifts", "/api/volunteers", "/api/team"]) {
      await request(ctx.app).get(path).expect(401);
    }
  });

  it("keeps organisations' data separate", async () => {
    const a = await createOrg(ctx, "a@x.example", "Org A");
    const b = await createOrg(ctx, "b@x.example", "Org B");
    const [shift] = (await a.agent.post("/api/shifts").send(newShift(ctx.clock.now)).expect(201)).body;
    await b.agent.get(`/api/shifts/${shift.id}`).expect(404);
    await b.agent.delete(`/api/shifts/${shift.id}`).expect(404);
  });
});

describe("shifts", () => {
  it("creates a shift and weekly repeats", async () => {
    const { agent } = await createOrg(ctx);
    const res = await agent.post("/api/shifts").send(newShift(ctx.clock.now, { repeatWeeks: 2 })).expect(201);
    expect(res.body).toHaveLength(3);
    expect(new Set(res.body.map((s: { seriesId: string }) => s.seriesId)).size).toBe(1);
    const list = await agent.get("/api/shifts").expect(200);
    expect(list.body).toHaveLength(3);
  });

  it("rejects bad times", async () => {
    const { agent } = await createOrg(ctx);
    const past = await agent.post("/api/shifts").send(newShift(hoursFrom(ctx.clock.now, -100)));
    expect(past.status).toBe(400);
    expect(past.body.fields.startsAt).toBeDefined();
    const backwards = await agent
      .post("/api/shifts")
      .send(newShift(ctx.clock.now, { endsAt: iso(hoursFrom(ctx.clock.now, 47)) }));
    expect(backwards.body.fields.endsAt).toBeDefined();
  });

  it("won't reduce spots below the number already booked", async () => {
    const { agent, me } = await createOrg(ctx);
    const [shift] = (await agent.post("/api/shifts").send(newShift(ctx.clock.now)).expect(201)).body;
    for (const e of ["a@v.example", "b@v.example"]) {
      await request(ctx.app).post(`/api/public/orgs/${me.org.slug}/shifts/${shift.id}/signup`).send({ name: "Vol", email: e });
    }
    const res = await agent.put(`/api/shifts/${shift.id}`).send({ ...newShift(ctx.clock.now), spots: 1 });
    expect(res.status).toBe(400);
    expect(res.body.fields.spots).toMatch(/2 people/);
  });

  it("emails booked volunteers when a shift is deleted", async () => {
    const { agent, me } = await createOrg(ctx);
    const [shift] = (await agent.post("/api/shifts").send(newShift(ctx.clock.now)).expect(201)).body;
    await request(ctx.app)
      .post(`/api/public/orgs/${me.org.slug}/shifts/${shift.id}/signup`)
      .send({ name: "Jaan", email: "jaan@v.example" });
    const res = await agent.delete(`/api/shifts/${shift.id}`).expect(200);
    expect(res.body).toEqual({ deleted: 1, notified: 1 });
    expect(ctx.mailer.last("jaan@v.example").subject).toMatch(/^Cancelled/);
  });
});

describe("volunteer sign-up (public)", () => {
  async function orgWithShift(spots = 2) {
    const org = await createOrg(ctx);
    const [shift] = (await org.agent.post("/api/shifts").send(newShift(ctx.clock.now, { spots })).expect(201)).body;
    const url = `/api/public/orgs/${org.me.org.slug}/shifts/${shift.id}/signup`;
    return { ...org, shift, url };
  }

  it("lists upcoming shifts on the public page", async () => {
    const { me } = await orgWithShift();
    const res = await request(ctx.app).get(`/api/public/orgs/${me.org.slug}`).expect(200);
    expect(res.body.name).toBe("Harbour Food Bank");
    expect(res.body.shifts).toHaveLength(1);
    await request(ctx.app).get("/api/public/orgs/nope").expect(404);
  });

  it("books a volunteer and emails a manage link", async () => {
    const { url, agent, shift } = await orgWithShift();
    await request(ctx.app).post(url).send({ name: "Kadri", email: "kadri@v.example" }).expect(201);
    const mail = ctx.mailer.last("kadri@v.example");
    expect(mail.subject).toMatch(/booked/i);
    expect(mail.text).toMatch(/http:\/\/app\.test\/s\/\S+/);
    const detail = await agent.get(`/api/shifts/${shift.id}`).expect(200);
    expect(detail.body.filled).toBe(1);
    expect(detail.body.signups[0].name).toBe("Kadri");
  });

  it("doesn't double-book the same person", async () => {
    const { url, agent, shift } = await orgWithShift();
    await request(ctx.app).post(url).send({ name: "Kadri", email: "kadri@v.example" }).expect(201);
    const again = await request(ctx.app).post(url).send({ name: "Kadri", email: "KADRI@v.example" });
    expect(again.status).toBe(200);
    expect(again.body.status).toBe("already-booked");
    expect((await agent.get(`/api/shifts/${shift.id}`)).body.filled).toBe(1);
  });

  it("never overbooks, even when two people grab the last spot at once", async () => {
    const { url, agent, shift } = await orgWithShift(1);
    const results = await Promise.all([
      request(ctx.app).post(url).send({ name: "One", email: "one@v.example" }),
      request(ctx.app).post(url).send({ name: "Two", email: "two@v.example" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await agent.get(`/api/shifts/${shift.id}`)).body.filled).toBe(1);
  });

  it("lets a volunteer view and cancel with their link, freeing the spot", async () => {
    const { url, agent, shift } = await orgWithShift(1);
    await request(ctx.app).post(url).send({ name: "Kadri", email: "kadri@v.example" }).expect(201);
    const token = ctx.mailer.link(ctx.mailer.last("kadri@v.example"), "/s/").pathname.split("/").pop()!;

    const view = await request(ctx.app).get(`/api/public/signups/${token}`).expect(200);
    expect(view.body.shift.title).toBe("Food sorting");
    expect(view.body.canCancel).toBe(true);

    await request(ctx.app).post(`/api/public/signups/${token}/cancel`).expect(200);
    expect((await request(ctx.app).get(`/api/public/signups/${token}`)).body.status).toBe("cancelled");
    expect((await agent.get(`/api/shifts/${shift.id}`)).body.filled).toBe(0);

    // The freed spot can be taken again
    await request(ctx.app).post(url).send({ name: "Liis", email: "liis@v.example" }).expect(201);
  });

  it("silently ignores bots on the public form", async () => {
    const { url, agent, shift } = await orgWithShift();
    await request(ctx.app).post(url).send({ name: "Bot", email: "bot@v.example", website: "x" }).expect(201);
    expect((await agent.get(`/api/shifts/${shift.id}`)).body.filled).toBe(0);
  });
});

describe("check-in, hours, volunteers and reminders", () => {
  it("records hours on check-in and shows them on the dashboard and volunteer list", async () => {
    const { agent, me } = await createOrg(ctx);
    const [shift] = (await agent.post("/api/shifts").send(newShift(ctx.clock.now)).expect(201)).body;
    await request(ctx.app)
      .post(`/api/public/orgs/${me.org.slug}/shifts/${shift.id}/signup`)
      .send({ name: "Kadri", email: "kadri@v.example" });
    const signupId = (await agent.get(`/api/shifts/${shift.id}`)).body.signups[0].id;

    await agent.post(`/api/shifts/${shift.id}/signups/${signupId}/check-in`).send({ checkedIn: true }).expect(200);

    const dash = await agent.get("/api/dashboard").expect(200);
    expect(dash.body.hoursThisMonth).toBe(3);
    expect(dash.body.volunteers).toBe(1);

    const vols = await agent.get("/api/volunteers").expect(200);
    expect(vols.body[0]).toMatchObject({ name: "Kadri", shifts: 1, hours: 3 });
  });

  it("exports volunteers as CSV, safe from spreadsheet formulas", async () => {
    const { agent, me } = await createOrg(ctx);
    const [shift] = (await agent.post("/api/shifts").send(newShift(ctx.clock.now)).expect(201)).body;
    await request(ctx.app)
      .post(`/api/public/orgs/${me.org.slug}/shifts/${shift.id}/signup`)
      .send({ name: "=HYPERLINK(1)", email: "evil@v.example" });
    const res = await agent.get("/api/volunteers/export.csv").expect(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toContain(`"'=HYPERLINK(1)"`);
  });

  it("deletes a volunteer's data on request (admin only)", async () => {
    const { agent, me } = await createOrg(ctx);
    const [shift] = (await agent.post("/api/shifts").send(newShift(ctx.clock.now)).expect(201)).body;
    await request(ctx.app)
      .post(`/api/public/orgs/${me.org.slug}/shifts/${shift.id}/signup`)
      .send({ name: "Kadri", email: "kadri@v.example" });
    const [vol] = (await agent.get("/api/volunteers")).body;
    await agent.delete(`/api/volunteers/${vol.id}`).expect(200);
    expect((await agent.get("/api/volunteers")).body).toHaveLength(0);
    expect((await agent.get(`/api/shifts/${shift.id}`)).body.filled).toBe(0);
  });

  it("sends exactly one reminder the day before", async () => {
    const { agent, me } = await createOrg(ctx);
    const [shift] = (await agent.post("/api/shifts").send(newShift(ctx.clock.now)).expect(201)).body;
    await request(ctx.app)
      .post(`/api/public/orgs/${me.org.slug}/shifts/${shift.id}/signup`)
      .send({ name: "Kadri", email: "kadri@v.example" });

    expect(await sendDueReminders(ctx.deps)).toBe(0); // shift is 48 h away
    ctx.clock.now = hoursFrom(ctx.clock.now, 30); // now 18 h before
    expect(await sendDueReminders(ctx.deps)).toBe(1);
    expect(ctx.mailer.last("kadri@v.example").subject).toMatch(/^Reminder/);
    expect(await sendDueReminders(ctx.deps)).toBe(0);
  });
});

describe("team", () => {
  it("invites a coordinator who can manage shifts but not admin settings", async () => {
    const { agent } = await createOrg(ctx);
    await agent.post("/api/team/invites").send({ email: "jaan@team.example", role: "coordinator" }).expect(201);
    const link = ctx.mailer.link(ctx.mailer.last("jaan@team.example"), "/invite");

    const coord = request.agent(ctx.app);
    const info = await coord.get(`/api/auth/invites/${link.searchParams.get("token")}`).expect(200);
    expect(info.body).toMatchObject({ kind: "team", organisation: "Harbour Food Bank", role: "coordinator" });

    await coord
      .post("/api/auth/accept-invite")
      .send({ token: link.searchParams.get("token"), name: "Jaan", password: "another-pass-1" })
      .expect(200);
    const me = (await coord.get("/api/auth/me")).body;
    expect(me).toMatchObject({ role: "coordinator", org: { name: "Harbour Food Bank" } });

    await coord.post("/api/shifts").send(newShift(ctx.clock.now)).expect(201);
    await coord.post("/api/team/invites").send({ email: "x@team.example", role: "admin" }).expect(403);
    await coord.put("/api/org").send({ name: "Hacked", slug: "hacked" }).expect(403);

    const team = await agent.get("/api/team").expect(200);
    expect(team.body.members).toHaveLength(2);
  });

  it("lets an admin rename the organisation and change its link", async () => {
    const { agent } = await createOrg(ctx);
    await agent.put("/api/org").send({ name: "Harbour FB", slug: "harbour" }).expect(200);
    const me = (await agent.get("/api/auth/me")).body;
    expect(me.org).toMatchObject({ name: "Harbour FB", slug: "harbour" });
    const bad = await agent.put("/api/org").send({ name: "X Org", slug: "Bad Slug!" });
    expect(bad.status).toBe(400);
  });
});

describe("rate limiting", () => {
  it("limits repeated attempts", async () => {
    const limited = await setup({ rateMax: 2 });
    await request(limited.app).post("/api/auth/login").send({ email: "a@b.example", password: "x" });
    await request(limited.app).post("/api/auth/login").send({ email: "a@b.example", password: "x" });
    const res = await request(limited.app).post("/api/auth/login").send({ email: "a@b.example", password: "x" });
    expect(res.status).toBe(429);
  });
});
