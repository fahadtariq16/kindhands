import nodemailer, { type Transporter } from "nodemailer";
import type { Db } from "../db/index.js";

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface Mailer {
  /** "smtp"/"resend" send real email; "outbox" stores it in the dev mailbox. */
  readonly mode: "smtp" | "resend" | "outbox";
  send(email: Email): Promise<void>;
}

export class SmtpMailer implements Mailer {
  readonly mode = "smtp" as const;
  private transport: Transporter;

  constructor(
    opts: { host: string; port: number; user: string; pass: string },
    private from: string,
  ) {
    this.transport = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.port === 465,
      auth: opts.user ? { user: opts.user, pass: opts.pass } : undefined,
      // Fail fast instead of hanging a request if the SMTP server can't be reached.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  async send(email: Email) {
    await this.transport.sendMail({ from: this.from, ...email });
  }
}

/**
 * Sends through Resend's HTTPS API (port 443). Use this on hosts that block SMTP ports,
 * such as Render's free plan.
 */
export class ResendMailer implements Mailer {
  readonly mode = "resend" as const;
  constructor(
    private apiKey: string,
    private from: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async send(email: Email) {
    const res = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Resend API ${res.status}: ${await res.text().catch(() => "")}`);
  }
}

/** Stores emails in the database so they can be read at /dev/mailbox. Never used when SMTP is set. */
export class OutboxMailer implements Mailer {
  readonly mode = "outbox" as const;
  constructor(private db: Db) {}

  async send(email: Email) {
    await this.db.query("INSERT INTO dev_outbox (to_email, subject, html, text) VALUES ($1, $2, $3, $4)", [
      email.to,
      email.subject,
      email.html,
      email.text,
    ]);
    console.log(`[mail] → ${email.to}: ${email.subject} (open /dev/mailbox to read it)`);
  }
}

/**
 * Sending email must never break the main action (a sign-up should succeed even if SMTP is down),
 * so failures are logged instead of thrown.
 */
export async function sendSafely(mailer: Mailer, email: Email) {
  try {
    await mailer.send(email);
  } catch (err) {
    console.error(`[mail] failed to send "${email.subject}" to ${email.to}:`, err);
  }
}
