import { escapeHtml } from "../lib/format.js";
import type { Email } from "./mailer.js";

const BRAND = "Kindhands";

/** Simple, email-client-safe layout (tables + inline styles). */
function layout(opts: { preheader: string; heading: string; body: string; cta?: { label: string; url: string }; footer?: string }) {
  const cta = opts.cta
    ? `<tr><td style="padding:8px 0 24px"><a href="${opts.cta.url}" style="display:inline-block;background:#5b5bf6;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:999px;font-family:Arial,sans-serif;font-size:15px">${escapeHtml(opts.cta.label)}</a></td></tr>
       <tr><td style="font-family:Arial,sans-serif;font-size:12px;color:#7d7a9e;padding-bottom:16px;word-break:break-all">Or copy this link: ${opts.cta.url}</td></tr>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f3fb;padding:32px 12px">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(opts.preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px" cellspacing="0" cellpadding="0">
<tr><td style="font-family:Arial,sans-serif;font-weight:700;font-size:18px;color:#16131f;padding-bottom:24px">${BRAND}</td></tr>
<tr><td style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#16131f;padding-bottom:12px">${escapeHtml(opts.heading)}</td></tr>
<tr><td style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#3f3b52;padding-bottom:20px">${opts.body}</td></tr>
${cta}
<tr><td style="font-family:Arial,sans-serif;font-size:12px;color:#7d7a9e;border-top:1px solid #eceaf5;padding-top:16px">${opts.footer ?? `You're receiving this because of activity on ${BRAND}.`}</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (s: string) => `<p style="margin:0 0 12px">${s}</p>`;

function shiftBox(s: { title: string; when: string; location: string; org: string }) {
  return `<table role="presentation" width="100%" style="background:#f4f3fb;border-radius:12px;margin:8px 0 4px" cellpadding="16"><tr><td style="font-family:Arial,sans-serif;font-size:14px;color:#16131f;line-height:1.6">
<strong style="font-size:16px">${escapeHtml(s.title)}</strong><br>${escapeHtml(s.when)}${s.location ? `<br>${escapeHtml(s.location)}` : ""}<br><span style="color:#7d7a9e">${escapeHtml(s.org)}</span>
</td></tr></table>`;
}

export function orgSetupEmail(to: string, name: string, organisation: string, url: string): Email {
  return {
    to,
    subject: `Set up ${organisation} on ${BRAND}`,
    html: layout({
      preheader: "Your beta access is ready",
      heading: `Welcome, ${name.split(" ")[0]}!`,
      body:
        p(`Thanks for joining the ${BRAND} beta. Your access is ready, so you can set up <strong>${escapeHtml(organisation)}</strong> right now.`) +
        p("It takes about two minutes: choose a password, create your first shift and share your sign-up link with volunteers."),
      cta: { label: "Set up your organisation", url },
      footer: "This link works for 14 days. If you didn't join the waitlist, you can ignore this email.",
    }),
    text: `Welcome, ${name}!\n\nYour ${BRAND} beta access is ready. Set up ${organisation} here (link works for 14 days):\n${url}\n`,
  };
}

export function teamInviteEmail(to: string, inviter: string, organisation: string, role: string, url: string): Email {
  return {
    to,
    subject: `${inviter} invited you to ${organisation} on ${BRAND}`,
    html: layout({
      preheader: `Join ${organisation} as ${role}`,
      heading: `Join ${organisation}`,
      body: p(`${escapeHtml(inviter)} invited you to help manage volunteer shifts for <strong>${escapeHtml(organisation)}</strong> as a <strong>${escapeHtml(role)}</strong>.`),
      cta: { label: "Accept invitation", url },
      footer: "This invitation works for 14 days. If you weren't expecting it, you can ignore this email.",
    }),
    text: `${inviter} invited you to ${organisation} on ${BRAND} as ${role}.\nAccept here: ${url}\n`,
  };
}

interface ShiftInfo {
  title: string;
  when: string;
  location: string;
  org: string;
}

export function signupConfirmationEmail(to: string, name: string, shift: ShiftInfo, manageUrl: string): Email {
  return {
    to,
    subject: `You're booked: ${shift.title}, ${shift.when}`,
    html: layout({
      preheader: `Thanks for volunteering with ${shift.org}`,
      heading: `Thanks, ${name.split(" ")[0]}! You're booked.`,
      body: shiftBox(shift) + p("We'll send you a reminder the day before. Can't make it any more? Please cancel so someone else can take your spot."),
      cta: { label: "View or cancel my shift", url: manageUrl },
    }),
    text: `Thanks ${name}! You're booked for ${shift.title} (${shift.org}), ${shift.when}${shift.location ? `, ${shift.location}` : ""}.\nView or cancel: ${manageUrl}\n`,
  };
}

export function reminderEmail(to: string, name: string, shift: ShiftInfo, manageUrl: string): Email {
  return {
    to,
    subject: `Reminder: ${shift.title} is coming up`,
    html: layout({
      preheader: `Your shift with ${shift.org} is soon`,
      heading: `See you soon, ${name.split(" ")[0]}`,
      body: p("Just a reminder about your upcoming shift:") + shiftBox(shift) + p("If you can't make it, please cancel so the team can find someone else."),
      cta: { label: "View or cancel my shift", url: manageUrl },
    }),
    text: `Reminder: ${shift.title} (${shift.org}), ${shift.when}${shift.location ? `, ${shift.location}` : ""}.\nView or cancel: ${manageUrl}\n`,
  };
}

export function shiftCancelledEmail(to: string, name: string, shift: ShiftInfo, signupUrl: string): Email {
  return {
    to,
    subject: `Cancelled: ${shift.title}, ${shift.when}`,
    html: layout({
      preheader: `${shift.org} cancelled a shift`,
      heading: "This shift was cancelled",
      body: p(`Hi ${escapeHtml(name.split(" ")[0])}, ${escapeHtml(shift.org)} has cancelled this shift, so you don't need to come:`) + shiftBox(shift) + p("Thank you for signing up. You can pick another shift any time."),
      cta: { label: "See other shifts", url: signupUrl },
    }),
    text: `${shift.org} cancelled ${shift.title}, ${shift.when}. See other shifts: ${signupUrl}\n`,
  };
}

export function removedFromShiftEmail(to: string, name: string, shift: ShiftInfo, signupUrl: string): Email {
  return {
    to,
    subject: `Update about ${shift.title}`,
    html: layout({
      preheader: `An update from ${shift.org}`,
      heading: "Your shift has changed",
      body: p(`Hi ${escapeHtml(name.split(" ")[0])}, the coordinator at ${escapeHtml(shift.org)} has removed you from this shift:`) + shiftBox(shift) + p("If you think this is a mistake, please contact the team. You can also pick another shift."),
      cta: { label: "See other shifts", url: signupUrl },
    }),
    text: `You were removed from ${shift.title} (${shift.org}), ${shift.when}. See other shifts: ${signupUrl}\n`,
  };
}
