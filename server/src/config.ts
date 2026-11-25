import "dotenv/config";

const env = process.env;
const isProd = env.NODE_ENV === "production";

export const config = {
  isProd,
  port: Number(env.PORT ?? 4000),
  /** Public URL of the web app. Used to build links inside emails. */
  appUrl: (env.APP_URL ?? "http://localhost:5173").replace(/\/$/, ""),
  /** Comma-separated list of allowed frontend origins. */
  corsOrigins: (env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  /**
   * PostgreSQL connection string. When empty, an embedded Postgres (PGlite) is used:
   * stored in PGLITE_DIR (default ./.data) so data survives restarts in local dev.
   */
  databaseUrl: env.DATABASE_URL ?? "",
  pgliteDir: env.PGLITE_DIR ?? "./.data",
  /** Resend HTTPS API key. Preferred over SMTP (works where SMTP ports are blocked, e.g. Render free plan). */
  resendApiKey: env.RESEND_API_KEY ?? "",
  /** SMTP settings. With no RESEND_API_KEY and no SMTP_HOST, emails go to the dev mailbox instead of being sent. */
  smtp: {
    host: env.SMTP_HOST ?? "",
    port: Number(env.SMTP_PORT ?? 587),
    user: env.SMTP_USER ?? "",
    pass: env.SMTP_PASS ?? "",
    from: env.MAIL_FROM ?? "Kindhands <hello@kindhands.example>",
  },
  rateLimit: {
    windowMs: Number(env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(env.RATE_LIMIT_MAX ?? 10),
  },
  /** How often the reminder job looks for shifts starting in the next 24 hours. */
  reminderIntervalMs: Number(env.REMINDER_INTERVAL_MS ?? 5 * 60 * 1000),
};

export type Config = typeof config;

/** Lists every missing or wrong setting, so a failed deploy says exactly what to fix. */
export function configProblems(c: Config = config): string[] {
  if (!c.isProd) return [];
  const problems: string[] = [];
  if (!c.databaseUrl) problems.push("DATABASE_URL is missing (copy the connection string from Neon).");
  else if (!/^postgres(ql)?:\/\//.test(c.databaseUrl))
    problems.push("DATABASE_URL must start with postgresql:// (check for quotes or spaces).");
  if (!c.resendApiKey && !c.smtp.host)
    problems.push("RESEND_API_KEY is missing (Resend → API Keys). SMTP is blocked on Render's free plan, so use the API key.");
  if (!c.resendApiKey && c.smtp.host && !c.smtp.pass) problems.push("SMTP_PASS is missing.");
  if (!process.env.MAIL_FROM) problems.push("MAIL_FROM is missing (e.g. Kindhands <hello@your-domain.com>).");
  if (!process.env.APP_URL || c.appUrl.includes("localhost"))
    problems.push("APP_URL is missing or points to localhost (use https://<your-site>.netlify.app).");
  return problems;
}
