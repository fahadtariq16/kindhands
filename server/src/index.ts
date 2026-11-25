import { config, configProblems } from "./config.js";
import { createApp } from "./app.js";
import { createDb } from "./db/index.js";
import { OutboxMailer, ResendMailer, SmtpMailer, type Mailer } from "./mail/mailer.js";
import { startReminderJob } from "./jobs/reminders.js";
import type { Deps } from "./services/context.js";

function fail(title: string, lines: string[]): never {
  console.error(`\n✖ ${title}\n${lines.map((l) => `  - ${l}`).join("\n")}\n`);
  process.exit(1);
}

const problems = configProblems();
if (problems.length) fail("Kindhands can't start. Fix these environment variables:", problems);

let db;
try {
  db = await createDb({ databaseUrl: config.databaseUrl, pgliteDir: config.pgliteDir });
} catch (err) {
  fail("Can't connect to the database. Check DATABASE_URL:", [
    String((err as Error).message ?? err),
    "Copy the connection string again from Neon (Dashboard → Connect).",
    "Remove '&channel_binding=require' if it's there; keep '?sslmode=require'.",
  ]);
}

let mailer: Mailer;
if (config.resendApiKey) {
  mailer = new ResendMailer(config.resendApiKey, config.smtp.from);
  console.log("[mail] sending with the Resend API");
} else if (config.smtp.host) {
  mailer = new SmtpMailer(config.smtp, config.smtp.from);
} else {
  mailer = new OutboxMailer(db);
  console.warn("[mail] SMTP not configured — emails go to the dev mailbox at /dev/mailbox");
}

const deps: Deps = { db, mailer, appUrl: config.appUrl, now: () => new Date() };

const app = createApp({
  deps,
  corsOrigins: config.corsOrigins,
  isProd: config.isProd,
  rateLimit: config.rateLimit,
  // Requests pass through Netlify's proxy and Render's load balancer: 2 hops by default.
  trustProxy: config.isProd ? Number(process.env.TRUST_PROXY_HOPS ?? 2) : false,
});

startReminderJob(deps, config.reminderIntervalMs);

app.listen(config.port, () => {
  console.log(`[api] listening on port ${config.port} (${config.isProd ? "production" : "development"})`);
});
