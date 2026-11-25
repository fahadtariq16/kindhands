import { Router } from "express";
import type { Db } from "../db/index.js";
import { idParam, notFound } from "../lib/http.js";

/**
 * Dev mailbox API. Only mounted when SMTP is not configured AND the app is not in production,
 * so it can never expose real emails.
 */
export function devRouter(db: Db) {
  const r = Router();

  r.get("/outbox", async (_req, res) => {
    const rows = await db.query<{ id: number; to_email: string; subject: string; created_at: Date }>(
      "SELECT id, to_email, subject, created_at FROM dev_outbox ORDER BY id DESC LIMIT 100",
    );
    res.json(rows.map((m) => ({ id: m.id, to: m.to_email, subject: m.subject, createdAt: m.created_at.toISOString() })));
  });

  r.get("/outbox/:id", async (req, res) => {
    const [m] = await db.query<{ id: number; to_email: string; subject: string; html: string; created_at: Date }>(
      "SELECT id, to_email, subject, html, created_at FROM dev_outbox WHERE id = $1",
      [idParam(req.params.id)],
    );
    if (!m) throw notFound("Email not found");
    res.json({ id: m.id, to: m.to_email, subject: m.subject, html: m.html, createdAt: m.created_at.toISOString() });
  });

  r.delete("/outbox", async (_req, res) => {
    await db.query("DELETE FROM dev_outbox");
    res.json({ ok: true });
  });

  return r;
}
