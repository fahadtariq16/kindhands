import { formatShiftTime } from "../lib/format.js";
import { sendSafely } from "../mail/mailer.js";
import { reminderEmail } from "../mail/templates.js";
import type { Deps } from "../services/context.js";

/**
 * Sends one reminder per booking for shifts starting in the next 24 hours
 * (skipping bookings made in the last hour, which just got a confirmation).
 * Each booking is claimed (reminded_at set) before the email goes out, so running the job
 * twice at once, or on two servers, never sends duplicates.
 */
export async function sendDueReminders(deps: Deps) {
  const now = deps.now();
  const due = await deps.db.query<{
    id: number;
    manage_token: string;
    name: string;
    email: string;
    title: string;
    location: string;
    starts_at: Date;
    ends_at: Date;
    org_name: string;
    timezone: string;
  }>(
    `UPDATE signups g SET reminded_at = $1
       FROM shifts s, volunteers v, organisations o
      WHERE s.id = g.shift_id AND v.id = g.volunteer_id AND o.id = s.org_id
        AND g.status = 'confirmed' AND g.reminded_at IS NULL
        AND s.starts_at > $1 AND s.starts_at <= $2
        -- someone who books a few minutes before the shift already has the confirmation email
        AND g.created_at <= $3
      RETURNING g.id, g.manage_token, v.name, v.email, s.title, s.location, s.starts_at, s.ends_at,
                o.name AS org_name, o.timezone`,
    [now, new Date(now.getTime() + 24 * 3_600_000), new Date(now.getTime() - 3_600_000)],
  );

  for (const r of due) {
    await sendSafely(
      deps.mailer,
      reminderEmail(
        r.email,
        r.name,
        { title: r.title, when: formatShiftTime(r.starts_at, r.ends_at, r.timezone), location: r.location, org: r.org_name },
        `${deps.appUrl}/s/${r.manage_token}`,
      ),
    );
  }
  return due.length;
}

export function startReminderJob(deps: Deps, intervalMs: number) {
  const run = () =>
    sendDueReminders(deps)
      .then((n) => n && console.log(`[reminders] sent ${n}`))
      .catch((err) => console.error("[reminders] failed", err));
  run();
  return setInterval(run, intervalMs);
}
