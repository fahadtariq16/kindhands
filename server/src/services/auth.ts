import type { AcceptInviteInput, InviteInfo, LoginInput, Me, Role, SetupInput } from "@kindhands/shared";
import { hashPassword, newToken, slugify, verifyPassword } from "../lib/security.js";
import { badRequest, conflict, HttpError, notFound } from "../lib/http.js";
import type { Queryable } from "../db/index.js";
import type { Deps } from "./context.js";

export const SESSION_DAYS = 30;
const INVITE_DAYS = 14;

/* ------------------------------ Sessions ------------------------------ */

export async function createSession(deps: Deps, userId: number, q: Queryable = deps.db) {
  const id = newToken();
  const expires = new Date(deps.now().getTime() + SESSION_DAYS * 86_400_000);
  await q.query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)", [id, userId, expires]);
  return { id, expires };
}

export async function deleteSession(deps: Deps, id: string) {
  await deps.db.query("DELETE FROM sessions WHERE id = $1", [id]);
}

/** Returns the signed-in user with their organisation and role, or null. */
export async function getSessionUser(deps: Deps, sessionId: string): Promise<Me | null> {
  const rows = await deps.db.query<{
    user_id: number;
    user_name: string;
    email: string;
    org_id: number;
    org_name: string;
    slug: string;
    timezone: string;
    role: Role;
  }>(
    `SELECT u.id AS user_id, u.name AS user_name, u.email, o.id AS org_id, o.name AS org_name, o.slug, o.timezone, m.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN memberships m ON m.user_id = u.id
       JOIN organisations o ON o.id = m.org_id
      WHERE s.id = $1 AND s.expires_at > $2
      ORDER BY m.created_at
      LIMIT 1`,
    [sessionId, deps.now()],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    user: { id: r.user_id, name: r.user_name, email: r.email },
    org: { id: r.org_id, name: r.org_name, slug: r.slug, timezone: r.timezone },
    role: r.role,
  };
}

/* ------------------------------ Login ------------------------------ */

export async function login(deps: Deps, input: LoginInput) {
  const [user] = await deps.db.query<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [input.email],
  );
  // Same message for unknown email and wrong password, so emails can't be probed.
  const ok = user ? await verifyPassword(input.password, user.password_hash) : false;
  if (!user || !ok) throw new HttpError(401, "Email or password is incorrect");
  return createSession(deps, user.id);
}

/* ------------------------------ Invites ------------------------------ */

export async function createOrgSetupInvite(
  deps: Deps,
  data: { email: string; name: string; organisation: string; orgType: string },
) {
  const token = newToken();
  const expires = new Date(deps.now().getTime() + INVITE_DAYS * 86_400_000);
  await deps.db.query(
    `INSERT INTO invites (token, kind, email, name, organisation, org_type, role, expires_at)
     VALUES ($1, 'org-setup', $2, $3, $4, $5, 'admin', $6)`,
    [token, data.email, data.name, data.organisation, data.orgType, expires],
  );
  return token;
}

export async function createTeamInvite(deps: Deps, orgId: number, email: string, role: Role) {
  const token = newToken();
  const expires = new Date(deps.now().getTime() + INVITE_DAYS * 86_400_000);
  await deps.db.query(
    `INSERT INTO invites (token, kind, email, org_id, role, expires_at) VALUES ($1, 'team', $2, $3, $4, $5)`,
    [token, email, orgId, role, expires],
  );
  return token;
}

interface InviteRow {
  token: string;
  kind: "org-setup" | "team";
  email: string;
  name: string | null;
  organisation: string | null;
  org_type: string | null;
  org_id: number | null;
  org_name: string | null;
  role: Role;
  expires_at: Date;
  used_at: Date | null;
}

async function loadValidInvite(deps: Deps, token: string, q: Queryable = deps.db): Promise<InviteRow> {
  const [row] = await q.query<InviteRow>(
    `SELECT i.*, o.name AS org_name FROM invites i LEFT JOIN organisations o ON o.id = i.org_id WHERE i.token = $1`,
    [token],
  );
  if (!row) throw notFound("This link is not valid. Please ask for a new one.");
  if (row.used_at) throw new HttpError(410, "This link has already been used. Please log in instead.");
  if (row.expires_at <= deps.now()) throw new HttpError(410, "This link has expired. Please ask for a new one.");
  return row;
}

export async function getInviteInfo(deps: Deps, token: string): Promise<InviteInfo> {
  const inv = await loadValidInvite(deps, token);
  return {
    kind: inv.kind,
    email: inv.email,
    name: inv.name,
    organisation: (inv.kind === "team" ? inv.org_name : inv.organisation) ?? "",
    role: inv.role,
  };
}

async function uniqueSlug(q: Queryable, base: string) {
  const root = slugify(base);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const taken = await q.query("SELECT 1 FROM organisations WHERE slug = $1", [candidate]);
    if (taken.length === 0) return candidate;
  }
  return `${root}-${newToken(4).toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

/** Waitlist invite → new user + new organisation + admin membership, then signs them in. */
export async function completeOrgSetup(deps: Deps, input: SetupInput) {
  return deps.db.tx(async (q) => {
    const inv = await loadValidInvite(deps, input.token, q);
    if (inv.kind !== "org-setup") throw badRequest("This link is for joining a team, not creating an organisation.");

    const existing = await q.query("SELECT 1 FROM users WHERE email = $1", [inv.email]);
    if (existing.length) throw conflict("An account with this email already exists. Please log in.");

    const [user] = await q.query<{ id: number }>(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [input.name, inv.email, await hashPassword(input.password)],
    );
    const slug = await uniqueSlug(q, input.organisation);
    const [org] = await q.query<{ id: number }>(
      "INSERT INTO organisations (name, slug, org_type) VALUES ($1, $2, $3) RETURNING id",
      [input.organisation, slug, inv.org_type ?? "charity"],
    );
    await q.query("INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'admin')", [user.id, org.id]);
    await q.query("UPDATE invites SET used_at = $1 WHERE token = $2", [deps.now(), inv.token]);
    return createSession(deps, user.id, q);
  });
}

/** Team invite → new user (or existing user proving their password) joins the organisation. */
export async function acceptTeamInvite(deps: Deps, input: AcceptInviteInput) {
  return deps.db.tx(async (q) => {
    const inv = await loadValidInvite(deps, input.token, q);
    if (inv.kind !== "team" || !inv.org_id) throw badRequest("This link is not a team invitation.");

    let [user] = await q.query<{ id: number; password_hash: string }>(
      "SELECT id, password_hash FROM users WHERE email = $1",
      [inv.email],
    );
    if (user) {
      // Existing account: require their real password so an invite link can't take over an account.
      if (!(await verifyPassword(input.password, user.password_hash)))
        throw new HttpError(401, "You already have an account. Enter your existing password to join.");
    } else {
      [user] = await q.query<{ id: number; password_hash: string }>(
        "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, password_hash",
        [input.name, inv.email, await hashPassword(input.password)],
      );
    }
    await q.query(
      `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role`,
      [user.id, inv.org_id, inv.role],
    );
    await q.query("UPDATE invites SET used_at = $1 WHERE token = $2", [deps.now(), inv.token]);
    return createSession(deps, user.id, q);
  });
}
