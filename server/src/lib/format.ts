/** Human-friendly date/time for emails, in the organisation's timezone. */
export function formatShiftTime(startsAt: Date, endsAt: Date, timeZone: string) {
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(startsAt);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone });
  return `${day}, ${time.format(startsAt)}–${time.format(endsAt)}`;
}

/** Hours between two dates, rounded to 1 decimal. */
export function hoursBetween(a: Date, b: Date) {
  return Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 10) / 10;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Make a value safe for a CSV cell (quotes + protection against spreadsheet formula injection). */
export function csvCell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
