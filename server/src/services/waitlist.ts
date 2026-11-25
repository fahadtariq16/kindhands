import type { WaitlistInput } from "@kindhands/shared";
import { sendSafely } from "../mail/mailer.js";
import { orgSetupEmail } from "../mail/templates.js";
import { createOrgSetupInvite } from "./auth.js";
import type { Deps } from "./context.js";

export type JoinResult = "joined" | "already-joined" | "ignored";

/**
 * Adds the organisation to the waitlist and emails them a link to set up their account.
 * During the beta every sign-up is invited straight away. To approve people manually later,
 * remove the invite step here and send invites from an admin screen instead.
 */
export async function joinWaitlist(deps: Deps, input: WaitlistInput): Promise<JoinResult> {
  // Honeypot filled in → almost certainly a bot. Pretend it worked, store nothing.
  if (input.website) return "ignored";

  const inserted = await deps.db.query(
    `INSERT INTO waitlist (name, email, organisation, org_type, volunteer_count, consent_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [input.name, input.email, input.organisation, input.orgType, input.volunteerCount, deps.now()],
  );

  // Already has an account? Don't send another setup link.
  const hasAccount = (await deps.db.query("SELECT 1 FROM users WHERE email = $1", [input.email])).length > 0;
  if (!hasAccount) {
    const token = await createOrgSetupInvite(deps, input);
    const url = `${deps.appUrl}/setup?token=${encodeURIComponent(token)}`;
    await sendSafely(deps.mailer, orgSetupEmail(input.email, input.name, input.organisation, url));
  }

  return inserted.length ? "joined" : "already-joined";
}
