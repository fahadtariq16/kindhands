import { useState } from "react";
import { useParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, CircleCheck, Clock, MapPin } from "lucide-react";
import { volunteerSignupSchema, type PublicOrg, type ShiftSummary } from "@kindhands/shared";
import { Empty, ErrorBox, Field, SpotsBar, Spinner } from "../../components/ui";
import { api } from "../../api/client";
import { useApi } from "../../lib/useApi";
import { formValues, useForm } from "../../lib/forms";
import { fmtRange, groupByDay, hours } from "../../lib/format";
import { PublicLayout } from "./PublicLayout";

/** The page volunteers see: pick a shift, enter name + email, done. */
export function OrgSignupPage() {
  const { slug } = useParams();
  const { data, error, loading, reload } = useApi<PublicOrg>(`/public/orgs/${slug}`);
  const [openId, setOpenId] = useState<number | null>(null);

  if (loading && !data) return <Spinner />;
  if (error || !data)
    return (
      <PublicLayout>
        <ErrorBox message={error?.message ?? "We couldn't find this page."} />
      </PublicLayout>
    );

  return (
    <PublicLayout>
      <p className="eyebrow">Volunteer with us</p>
      <h1 style={{ fontSize: "clamp(2.25rem, 6vw, 3.5rem)", marginTop: 14 }}>
        {data.name} <span className="serif">needs you.</span>
      </h1>
      <p className="ui-soft" style={{ marginTop: 14, fontSize: "1.125rem", maxWidth: "52ch" }}>
        Pick a shift that suits you. Just your name and email, no account needed. You'll get a confirmation and a reminder by
        email.
      </p>

      <div style={{ marginTop: 40 }}>
        {data.shifts.length === 0 ? (
          <Empty icon={CalendarDays} title="No open shifts right now">
            <p>Please check back soon.</p>
          </Empty>
        ) : (
          groupByDay(data.shifts).map((g) => (
            <section key={g.day} aria-label={g.day}>
              <h2 className="ui-day" style={{ marginTop: 28 }}>
                {g.day}
              </h2>
              <ul className="ui-list">
                {g.items.map((s) => (
                  <ShiftCard
                    key={s.id}
                    shift={s}
                    slug={data.slug}
                    open={openId === s.id}
                    onToggle={() => setOpenId(openId === s.id ? null : s.id)}
                    onBooked={reload}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </PublicLayout>
  );
}

function ShiftCard({
  shift,
  slug,
  open,
  onToggle,
  onBooked,
}: {
  shift: ShiftSummary;
  slug: string;
  open: boolean;
  onToggle: () => void;
  onBooked: () => Promise<void>;
}) {
  const { errors, formError, busy, submit } = useForm(volunteerSignupSchema);
  const [booked, setBooked] = useState<string | null>(null);
  const left = shift.spots - shift.filled;
  const full = left <= 0;
  const formId = `signup-${shift.id}`;

  return (
    <li className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "18px 20px", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: "1.125rem", letterSpacing: "-0.02em" }}>{shift.title}</h3>
          <p className="ui-muted" style={{ fontSize: "0.9375rem", display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Clock size={14} aria-hidden="true" /> {fmtRange(shift.startsAt, shift.endsAt)} ({hours(shift.startsAt, shift.endsAt)} h)
            </span>
            {shift.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <MapPin size={14} aria-hidden="true" /> {shift.location}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "grid", gap: 6, justifyItems: "end" }}>
            <span className={`ui-badge ${full ? "" : left <= 2 ? "warn" : "ok"}`}>
              {full ? "Full" : `${left} ${left === 1 ? "spot" : "spots"} left`}
            </span>
            <SpotsBar filled={shift.filled} spots={shift.spots} />
          </span>
          {!full && !booked && (
            <button
              type="button"
              className={`btn ${open ? "btn-glass" : "btn-primary"} btn-sm`}
              aria-expanded={open}
              aria-controls={formId}
              onClick={onToggle}
            >
              {open ? "Close" : "Sign up"}
              <span className="visually-hidden">: {shift.title}</span>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {(open || booked) && (
          <motion.div
            id={formId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden", borderTop: "1px solid var(--border)" }}
          >
            <div style={{ padding: "18px 20px 20px" }}>
              {shift.description && (
                <p className="ui-soft" style={{ whiteSpace: "pre-line", marginBottom: 16, fontSize: "0.9375rem" }}>
                  {shift.description}
                </p>
              )}
              {booked ? (
                <p className="ui-note" role="status" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <CircleCheck size={18} aria-hidden="true" /> {booked}
                </p>
              ) : (
                <form
                  className="ui-form"
                  noValidate
                  onSubmit={(e) =>
                    submit(e, formValues(e.currentTarget), async (d) => {
                      const res = await api<{ status: string }>(`/public/orgs/${slug}/shifts/${shift.id}/signup`, { body: d });
                      setBooked(
                        res.status === "already-booked"
                          ? "You're already booked on this shift. We've emailed you the details again."
                          : `You're booked, ${d.name.split(" ")[0]}! Check your email for the details.`,
                      );
                      await onBooked();
                    })
                  }
                >
                  <div className="ui-row">
                    <Field name="name" label="Your name" autoComplete="name" error={errors.name} />
                    <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
                  </div>
                  <div aria-hidden="true" style={{ position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" }}>
                    <label htmlFor={`website-${shift.id}`}>Website</label>
                    <input id={`website-${shift.id}`} name="website" tabIndex={-1} autoComplete="off" />
                  </div>
                  {formError && <ErrorBox message={formError} />}
                  <p className="ui-muted" style={{ fontSize: "0.8125rem" }}>
                    We only use your details to organise this shift. You can cancel any time from your confirmation email.
                  </p>
                  <div>
                    <button type="submit" className="btn btn-grad" disabled={busy}>
                      {busy ? "Booking…" : "Confirm my spot"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
