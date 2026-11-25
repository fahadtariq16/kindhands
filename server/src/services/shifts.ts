import type { ShiftDetail, ShiftSignup, ShiftSummary, ShiftUpdateInput, VolunteerSignupInput } from "@kindhands/shared";
import type { z } from "zod";
import type { shiftSchema } from "@kindhands/shared";
import { formatShiftTime } from "../lib/format.js";
import { badRequest, conflict, HttpError, notFound } from "../lib/http.js";
import { newToken } from "../lib/security.js";
import { sendSafely } from "../mail/mailer.js";
import { removedFromShiftEmail, shiftCancelledEmail, signupConfirmationEmail } from "../mail/templates.js";
import type { Queryable } from "../db/index.js";
import type { Deps } from "./context.js";

type ShiftCreate = z.output<typeof shiftSchema>;

interface ShiftRow {
  id: number;
  org_id: number;
  title: string;
  description: string;
  location: string;
  starts_at: Date;
  ends_at: Date;
  spots: number;
  filled: number;
  series_id: string | null;
}

export const SHIFT_COLUMNS = `s.id, s.org_id, s.title, s.description, s.location, s.starts_at, s.ends_at, s.spots, s.series_id,
  (SELECT COUNT(*)::int FROM signups x WHERE x.shift_id = s.id AND x.status = 'confirmed') AS filled`;

export function toSummary(r: ShiftRow): ShiftSummary {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    location: r.location,
    startsAt: r.starts_at.toISOString(),
    endsAt: r.ends_at.toISOString(),
    spots: r.spots,
    filled: r.filled,
    seriesId: r.series_id,
  };
}

/** With lock = true the row stays locked until the transaction ends ("filled" is then not computed). */
async function loadShift(q: Queryable, orgId: number, shiftId: number, lock = false) {
  const columns = lock
    ? "s.id, s.org_id, s.title, s.description, s.location, s.starts_at, s.ends_at, s.spots, s.series_id, 0 AS filled"
    : SHIFT_COLUMNS;
  const [row] = await q.query<ShiftRow>(
    `SELECT ${columns} FROM shifts s WHERE s.id = $1 AND s.org_id = $2 ${lock ? "FOR UPDATE" : ""}`,
    [shiftId, orgId],
  );
  if (!row) throw notFound("Shift not found");
  return row;
}

async function orgInfo(q: Queryable, orgId: number) {
  const [org] = await q.query<{ name: string; slug: string; timezone: string }>(
    "SELECT name, slug, timezone FROM organisations WHERE id = $1",
    [orgId],
  );
  return org;
}

function emailShift(row: ShiftRow, org: { name: string; timezone: string }) {
  return {
    title: row.title,
    when: formatShiftTime(row.starts_at, row.ends_at, org.timezone),
    location: row.location,
    org: org.name,
  };
}

/* ------------------------------ Read ------------------------------ */

export async function listShifts(deps: Deps, orgId: number, range: "upcoming" | "past"): Promise<ShiftSummary[]> {
  const rows = await deps.db.query<ShiftRow>(
    range === "upcoming"
      ? `SELECT ${SHIFT_COLUMNS} FROM shifts s WHERE s.org_id = $1 AND s.ends_at >= $2 ORDER BY s.starts_at LIMIT 500`
      : `SELECT ${SHIFT_COLUMNS} FROM shifts s WHERE s.org_id = $1 AND s.ends_at < $2 ORDER BY s.starts_at DESC LIMIT 500`,
    [orgId, deps.now()],
  );
  return rows.map(toSummary);
}

export async function getShift(deps: Deps, orgId: number, shiftId: number): Promise<ShiftDetail> {
  const row = await loadShift(deps.db, orgId, shiftId);
  const signups = await deps.db.query<{
    id: number;
    volunteer_id: number;
    name: string;
    email: string;
    status: "confirmed" | "cancelled";
    checked_in_at: Date | null;
    created_at: Date;
  }>(
    `SELECT g.id, g.volunteer_id, v.name, v.email, g.status, g.checked_in_at, g.created_at
       FROM signups g JOIN volunteers v ON v.id = g.volunteer_id
      WHERE g.shift_id = $1
      ORDER BY g.status, g.created_at`,
    [shiftId],
  );
  return {
    ...toSummary(row),
    signups: signups.map<ShiftSignup>((s) => ({
      id: s.id,
      volunteerId: s.volunteer_id,
      name: s.name,
      email: s.email,
      status: s.status,
      checkedIn: s.checked_in_at !== null,
      createdAt: s.created_at.toISOString(),
    })),
  };
}

/* ------------------------------ Write ------------------------------ */

/** Creates a shift, plus weekly copies when repeatWeeks > 0 (they share a series id). */
export async function createShifts(deps: Deps, orgId: number, input: ShiftCreate): Promise<ShiftSummary[]> {
  const start = new Date(input.startsAt);
  const end = new Date(input.endsAt);
  if (start < deps.now()) throw badRequest("Please check the highlighted fields.", { startsAt: "Start time is in the past" });
  const seriesId = input.repeatWeeks > 0 ? newToken(9) : null;
  const week = 7 * 86_400_000;

  return deps.db.tx(async (q) => {
    const created: ShiftSummary[] = [];
    for (let i = 0; i <= input.repeatWeeks; i++) {
      const [row] = await q.query<ShiftRow>(
        `INSERT INTO shifts (org_id, title, description, location, starts_at, ends_at, spots, series_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, org_id, title, description, location, starts_at, ends_at, spots, series_id, 0 AS filled`,
        [
          orgId,
          input.title,
          input.description,
          input.location,
          new Date(start.getTime() + i * week),
          new Date(end.getTime() + i * week),
          input.spots,
          seriesId,
        ],
      );
      created.push(toSummary(row));
    }
    return created;
  });
}

export async function updateShift(deps: Deps, orgId: number, shiftId: number, input: Required<ShiftUpdateInput>) {
  return deps.db.tx(async (q) => {
    await loadShift(q, orgId, shiftId, true);
    const [{ n }] = await q.query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM signups WHERE shift_id = $1 AND status = 'confirmed'",
      [shiftId],
    );
    if (Number(input.spots) < n)
      throw badRequest("Please check the highlighted fields.", { spots: `${n} people are already booked. Remove some first.` });
    await q.query(
      `UPDATE shifts SET title = $1, description = $2, location = $3, starts_at = $4, ends_at = $5, spots = $6
        WHERE id = $7 AND org_id = $8`,
      [input.title, input.description, input.location, new Date(input.startsAt), new Date(input.endsAt), input.spots, shiftId, orgId],
    );
  });
}

/** Deletes a shift (or every future shift in its series) and emails everyone who was booked. */
export async function deleteShift(deps: Deps, orgId: number, shiftId: number, wholeSeries: boolean) {
  const row = await loadShift(deps.db, orgId, shiftId);
  const targets =
    wholeSeries && row.series_id
      ? await deps.db.query<ShiftRow>(
          `SELECT ${SHIFT_COLUMNS} FROM shifts s WHERE s.org_id = $1 AND s.series_id = $2 AND s.starts_at >= $3`,
          [orgId, row.series_id, row.starts_at],
        )
      : [row];

  const org = await orgInfo(deps.db, orgId);
  const booked = await deps.db.query<{ shift_id: number; name: string; email: string }>(
    `SELECT g.shift_id, v.name, v.email FROM signups g JOIN volunteers v ON v.id = g.volunteer_id
      WHERE g.shift_id = ANY($1::int[]) AND g.status = 'confirmed'`,
    [targets.map((t) => t.id)],
  );

  await deps.db.query("DELETE FROM shifts WHERE id = ANY($1::int[]) AND org_id = $2", [targets.map((t) => t.id), orgId]);

  const now = deps.now();
  const signupPage = `${deps.appUrl}/o/${org.slug}`;
  for (const b of booked) {
    const t = targets.find((x) => x.id === b.shift_id)!;
    if (t.starts_at > now) await sendSafely(deps.mailer, shiftCancelledEmail(b.email, b.name, emailShift(t, org), signupPage));
  }
  return { deleted: targets.length, notified: booked.length };
}

/* ------------------------------ Sign-ups ------------------------------ */

/**
 * Books a volunteer onto a shift.
 * The shift row is locked (SELECT … FOR UPDATE) for the whole transaction, so when two people
 * try to take the last spot at the same moment, one waits for the other and then sees it is full.
 */
export async function signUp(
  deps: Deps,
  orgId: number,
  shiftId: number,
  input: VolunteerSignupInput,
): Promise<{ status: "booked" | "already-booked"; token: string }> {
  const result = await deps.db.tx(async (q) => {
    const shift = await loadShift(q, orgId, shiftId, true);
    if (shift.starts_at <= deps.now()) throw badRequest("This shift has already started.");

    const [{ n }] = await q.query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM signups WHERE shift_id = $1 AND status = 'confirmed'",
      [shiftId],
    );

    const [vol] = await q.query<{ id: number; name: string }>(
      `INSERT INTO volunteers (org_id, name, email) VALUES ($1, $2, $3)
       ON CONFLICT (org_id, email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name`,
      [orgId, input.name, input.email],
    );

    const [existing] = await q.query<{ id: number; status: string; manage_token: string }>(
      "SELECT id, status, manage_token FROM signups WHERE shift_id = $1 AND volunteer_id = $2",
      [shiftId, vol.id],
    );
    if (existing?.status === "confirmed") return { status: "already-booked" as const, token: existing.manage_token, shift };

    if (n >= shift.spots) throw conflict("Sorry, this shift is now full.");

    let token: string;
    if (existing) {
      token = existing.manage_token;
      await q.query("UPDATE signups SET status = 'confirmed', reminded_at = NULL, created_at = $2 WHERE id = $1", [
        existing.id,
        deps.now(),
      ]);
    } else {
      token = newToken();
      await q.query("INSERT INTO signups (shift_id, volunteer_id, manage_token, created_at) VALUES ($1, $2, $3, $4)", [
        shiftId,
        vol.id,
        token,
        deps.now(),
      ]);
    }
    return { status: "booked" as const, token, shift };
  });

  // Email after the transaction commits: a slow mail server never holds the lock.
  const org = await orgInfo(deps.db, orgId);
  await sendSafely(
    deps.mailer,
    signupConfirmationEmail(input.email, input.name, emailShift(result.shift, org), `${deps.appUrl}/s/${result.token}`),
  );
  return { status: result.status, token: result.token };
}

export async function setCheckIn(deps: Deps, orgId: number, shiftId: number, signupId: number, checkedIn: boolean) {
  await loadShift(deps.db, orgId, shiftId);
  const rows = await deps.db.query(
    `UPDATE signups SET checked_in_at = $1 WHERE id = $2 AND shift_id = $3 AND status = 'confirmed' RETURNING id`,
    [checkedIn ? deps.now() : null, signupId, shiftId],
  );
  if (!rows.length) throw notFound("Booking not found");
}

export async function removeSignup(deps: Deps, orgId: number, shiftId: number, signupId: number) {
  const shift = await loadShift(deps.db, orgId, shiftId);
  const [row] = await deps.db.query<{ name: string; email: string }>(
    `UPDATE signups g SET status = 'cancelled', checked_in_at = NULL
       FROM volunteers v
      WHERE g.id = $1 AND g.shift_id = $2 AND v.id = g.volunteer_id AND g.status = 'confirmed'
      RETURNING v.name, v.email`,
    [signupId, shiftId],
  );
  if (!row) throw notFound("Booking not found");
  if (shift.starts_at > deps.now()) {
    const org = await orgInfo(deps.db, orgId);
    await sendSafely(deps.mailer, removedFromShiftEmail(row.email, row.name, emailShift(shift, org), `${deps.appUrl}/o/${org.slug}`));
  }
}

/* ------------------------------ Public (volunteer) side ------------------------------ */

export async function publicOrg(deps: Deps, slug: string) {
  const [org] = await deps.db.query<{ id: number; name: string; slug: string; timezone: string }>(
    "SELECT id, name, slug, timezone FROM organisations WHERE slug = $1",
    [slug],
  );
  if (!org) throw notFound("We couldn't find this organisation");
  const now = deps.now();
  const rows = await deps.db.query<ShiftRow>(
    `SELECT ${SHIFT_COLUMNS} FROM shifts s
      WHERE s.org_id = $1 AND s.starts_at > $2 AND s.starts_at < $3
      ORDER BY s.starts_at LIMIT 200`,
    [org.id, now, new Date(now.getTime() + 90 * 86_400_000)],
  );
  return { org, shifts: rows.map(toSummary) };
}

export async function publicSignUp(deps: Deps, slug: string, shiftId: number, input: VolunteerSignupInput) {
  if (input.website) return { status: "booked" as const }; // honeypot: look normal, do nothing
  const { org } = await publicOrg(deps, slug);
  const result = await signUp(deps, org.id, shiftId, input);
  return { status: result.status };
}

async function loadByToken(deps: Deps, token: string) {
  const [row] = await deps.db.query<{
    signup_id: number;
    status: "confirmed" | "cancelled";
    volunteer_name: string;
    org_name: string;
    slug: string;
    timezone: string;
    title: string;
    location: string;
    description: string;
    starts_at: Date;
    ends_at: Date;
  }>(
    `SELECT g.id AS signup_id, g.status, v.name AS volunteer_name, o.name AS org_name, o.slug, o.timezone,
            s.title, s.location, s.description, s.starts_at, s.ends_at
       FROM signups g
       JOIN volunteers v ON v.id = g.volunteer_id
       JOIN shifts s ON s.id = g.shift_id
       JOIN organisations o ON o.id = s.org_id
      WHERE g.manage_token = $1`,
    [token],
  );
  if (!row) throw notFound("This link is not valid any more.");
  return row;
}

export async function getManagedSignup(deps: Deps, token: string) {
  const r = await loadByToken(deps, token);
  return {
    status: r.status,
    volunteerName: r.volunteer_name,
    org: { name: r.org_name, slug: r.slug, timezone: r.timezone },
    shift: {
      title: r.title,
      location: r.location,
      description: r.description,
      startsAt: r.starts_at.toISOString(),
      endsAt: r.ends_at.toISOString(),
    },
    canCancel: r.status === "confirmed" && r.starts_at > deps.now(),
  };
}

export async function cancelByToken(deps: Deps, token: string) {
  const r = await loadByToken(deps, token);
  if (r.status === "cancelled") return;
  if (r.starts_at <= deps.now()) throw new HttpError(400, "This shift has already started, so it can't be cancelled here.");
  await deps.db.query("UPDATE signups SET status = 'cancelled' WHERE id = $1", [r.signup_id]);
}
