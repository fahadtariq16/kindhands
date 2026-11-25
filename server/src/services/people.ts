import type { DashboardData, OrgSettingsInput, PendingInvite, Role, TeamMember, VolunteerRow } from "@kindhands/shared";
import { csvCell } from "../lib/format.js";
import { conflict, forbidden, notFound } from "../lib/http.js";
import { sendSafely } from "../mail/mailer.js";
import { teamInviteEmail } from "../mail/templates.js";
import { createTeamInvite } from "./auth.js";
import { SHIFT_COLUMNS, toSummary } from "./shifts.js";
import type { Deps } from "./context.js";

/* ------------------------------ Dashboard ------------------------------ */

export async function dashboard(deps: Deps, orgId: number, timeZone: string): Promise<DashboardData> {
  const now = deps.now();
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  const monthStart = startOfMonthInZone(now, timeZone);

  const [stats] = await deps.db.query<{ upcoming: number; open_spots: number; volunteers: number; hours: number }>(
    `SELECT
       (SELECT COUNT(*)::int FROM shifts s WHERE s.org_id = $1 AND s.starts_at BETWEEN $2 AND $3) AS upcoming,
       (SELECT COALESCE(SUM(GREATEST(s.spots - (SELECT COUNT(*) FROM signups g WHERE g.shift_id = s.id AND g.status = 'confirmed'), 0)), 0)::int
          FROM shifts s WHERE s.org_id = $1 AND s.starts_at BETWEEN $2 AND $3) AS open_spots,
       (SELECT COUNT(*)::int FROM volunteers v WHERE v.org_id = $1) AS volunteers,
       (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (s.ends_at - s.starts_at)) / 3600), 0)::float
          FROM signups g JOIN shifts s ON s.id = g.shift_id
         WHERE s.org_id = $1 AND g.checked_in_at IS NOT NULL AND s.starts_at >= $4) AS hours`,
    [orgId, now, in7, monthStart],
  );

  const next = await deps.db.query<Parameters<typeof toSummary>[0]>(
    `SELECT ${SHIFT_COLUMNS} FROM shifts s WHERE s.org_id = $1 AND s.ends_at >= $2 ORDER BY s.starts_at LIMIT 5`,
    [orgId, now],
  );
  const recent = await deps.db.query<{ name: string; title: string; shift_id: number; created_at: Date }>(
    `SELECT v.name, s.title, s.id AS shift_id, g.created_at
       FROM signups g JOIN volunteers v ON v.id = g.volunteer_id JOIN shifts s ON s.id = g.shift_id
      WHERE s.org_id = $1 AND g.status = 'confirmed'
      ORDER BY g.created_at DESC LIMIT 6`,
    [orgId],
  );

  return {
    upcomingShifts: stats.upcoming,
    openSpots: stats.open_spots,
    volunteers: stats.volunteers,
    hoursThisMonth: Math.round(Number(stats.hours) * 10) / 10,
    nextShifts: next.map(toSummary),
    recentSignups: recent.map((r) => ({
      name: r.name,
      shiftTitle: r.title,
      shiftId: r.shift_id,
      createdAt: r.created_at.toISOString(),
    })),
  };
}

/** First moment of the current month in the organisation's timezone, as a UTC Date. */
function startOfMonthInZone(now: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const guess = new Date(`${parts.year}-${parts.month}-01T00:00:00Z`);
  // Correct for the zone's UTC offset on that date.
  const local = new Date(guess.toLocaleString("en-US", { timeZone }));
  return new Date(guess.getTime() - (local.getTime() - guess.getTime()));
}

/* ------------------------------ Volunteers ------------------------------ */

export async function listVolunteers(deps: Deps, orgId: number): Promise<VolunteerRow[]> {
  const rows = await deps.db.query<{
    id: number;
    name: string;
    email: string;
    shifts: number;
    hours: number;
    last_shift_at: Date | null;
    created_at: Date;
  }>(
    `SELECT v.id, v.name, v.email, v.created_at,
            COUNT(g.id) FILTER (WHERE g.status = 'confirmed')::int AS shifts,
            COALESCE(SUM(EXTRACT(EPOCH FROM (s.ends_at - s.starts_at)) / 3600) FILTER (WHERE g.checked_in_at IS NOT NULL), 0)::float AS hours,
            MAX(s.starts_at) FILTER (WHERE g.status = 'confirmed') AS last_shift_at
       FROM volunteers v
       LEFT JOIN signups g ON g.volunteer_id = v.id
       LEFT JOIN shifts s ON s.id = g.shift_id
      WHERE v.org_id = $1
      GROUP BY v.id
      ORDER BY v.name`,
    [orgId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    shifts: r.shifts,
    hours: Math.round(Number(r.hours) * 10) / 10,
    lastShiftAt: r.last_shift_at ? r.last_shift_at.toISOString() : null,
    joinedAt: r.created_at.toISOString(),
  }));
}

export async function volunteersCsv(deps: Deps, orgId: number) {
  const rows = await listVolunteers(deps, orgId);
  const header = ["Name", "Email", "Shifts booked", "Hours checked in", "Last shift", "First signed up"];
  const lines = rows.map((r) =>
    [r.name, r.email, r.shifts, r.hours, r.lastShiftAt?.slice(0, 10) ?? "", r.joinedAt.slice(0, 10)].map(csvCell).join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}

/** GDPR erasure: removes the volunteer and all their bookings for this organisation. */
export async function deleteVolunteer(deps: Deps, orgId: number, volunteerId: number) {
  const rows = await deps.db.query("DELETE FROM volunteers WHERE id = $1 AND org_id = $2 RETURNING id", [volunteerId, orgId]);
  if (!rows.length) throw notFound("Volunteer not found");
}

/* ------------------------------ Team ------------------------------ */

export async function listTeam(deps: Deps, orgId: number): Promise<{ members: TeamMember[]; invites: PendingInvite[] }> {
  const members = await deps.db.query<{ user_id: number; name: string; email: string; role: Role }>(
    `SELECT u.id AS user_id, u.name, u.email, m.role FROM memberships m JOIN users u ON u.id = m.user_id
      WHERE m.org_id = $1 ORDER BY m.role, u.name`,
    [orgId],
  );
  const invites = await deps.db.query<{ email: string; role: Role; created_at: Date }>(
    `SELECT email, role, created_at FROM invites
      WHERE org_id = $1 AND kind = 'team' AND used_at IS NULL AND expires_at > $2 ORDER BY created_at DESC`,
    [orgId, deps.now()],
  );
  return {
    members: members.map((m) => ({ userId: m.user_id, name: m.name, email: m.email, role: m.role })),
    invites: invites.map((i) => ({ email: i.email, role: i.role, createdAt: i.created_at.toISOString() })),
  };
}

export async function inviteToTeam(
  deps: Deps,
  org: { id: number; name: string },
  inviterName: string,
  email: string,
  role: Role,
) {
  const already = await deps.db.query(
    "SELECT 1 FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = $1 AND u.email = $2",
    [org.id, email],
  );
  if (already.length) throw conflict("This person is already on your team.", { email: "Already a team member" });
  const token = await createTeamInvite(deps, org.id, email, role);
  await sendSafely(
    deps.mailer,
    teamInviteEmail(email, inviterName, org.name, role, `${deps.appUrl}/invite?token=${encodeURIComponent(token)}`),
  );
}

export async function removeMember(deps: Deps, orgId: number, actorId: number, userId: number) {
  if (actorId === userId) throw forbidden("You can't remove yourself.");
  const rows = await deps.db.query("DELETE FROM memberships WHERE org_id = $1 AND user_id = $2 RETURNING user_id", [orgId, userId]);
  if (!rows.length) throw notFound("Team member not found");
}

/* ------------------------------ Organisation ------------------------------ */

export async function updateOrg(deps: Deps, orgId: number, input: OrgSettingsInput) {
  const taken = await deps.db.query("SELECT 1 FROM organisations WHERE slug = $1 AND id <> $2", [input.slug, orgId]);
  if (taken.length) throw conflict("That link is already taken.", { slug: "Already taken, try another" });
  await deps.db.query("UPDATE organisations SET name = $1, slug = $2 WHERE id = $3", [input.name, input.slug, orgId]);
}
