import { Link, useParams } from "react-router";
import { CalendarCheck2, CalendarX2, Clock, MapPin } from "lucide-react";
import type { ManagedSignup } from "@kindhands/shared";
import { ConfirmButton, ErrorBox, Spinner } from "../../components/ui";
import { api } from "../../api/client";
import { useApi } from "../../lib/useApi";
import { fmtLongDay, fmtRange } from "../../lib/format";
import { PublicLayout } from "./PublicLayout";

/** Opened from the volunteer's confirmation or reminder email. */
export function ManageSignup() {
  const { token } = useParams();
  const { data, error, loading, reload } = useApi<ManagedSignup>(`/public/signups/${token}`);

  if (loading && !data) return <Spinner />;
  if (error || !data)
    return (
      <PublicLayout>
        <ErrorBox message={error?.message ?? "This link is not valid any more."} />
      </PublicLayout>
    );

  const cancelled = data.status === "cancelled";
  const Icon = cancelled ? CalendarX2 : CalendarCheck2;

  return (
    <PublicLayout>
      <p className="eyebrow">{data.org.name}</p>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginTop: 14 }}>
        {cancelled ? (
          <>
            Your shift is <span className="serif">cancelled.</span>
          </>
        ) : (
          <>
            You're <span className="serif">booked</span>, {data.volunteerName.split(" ")[0]}.
          </>
        )}
      </h1>

      <section className="ui-card" style={{ marginTop: 28, display: "grid", gap: 10 }} aria-label="Shift details">
        <p style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.25rem", fontWeight: 600 }}>
          <Icon size={22} aria-hidden="true" style={{ color: cancelled ? "var(--text-dim)" : "var(--mint)" }} />
          {data.shift.title}
        </p>
        <p className="ui-soft" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={15} aria-hidden="true" /> {fmtLongDay(data.shift.startsAt)}, {fmtRange(data.shift.startsAt, data.shift.endsAt)}
        </p>
        {data.shift.location && (
          <p className="ui-soft" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={15} aria-hidden="true" /> {data.shift.location}
          </p>
        )}
        {data.shift.description && (
          <p className="ui-soft" style={{ whiteSpace: "pre-line", marginTop: 6 }}>
            {data.shift.description}
          </p>
        )}
      </section>

      <div className="ui-actions" style={{ marginTop: 24 }}>
        {data.canCancel && (
          <ConfirmButton
            className="btn btn-danger"
            confirmLabel="Yes, cancel my shift"
            onConfirm={async () => {
              await api(`/public/signups/${token}/cancel`, { method: "POST", body: {} });
              await reload();
            }}
          >
            I can't make it
          </ConfirmButton>
        )}
        <Link to={`/o/${data.org.slug}`} className="btn btn-glass">
          {cancelled ? "Pick another shift" : "See other shifts"}
        </Link>
      </div>
      {cancelled && (
        <p className="ui-muted" style={{ marginTop: 16 }}>
          Thanks for letting the team know. Your spot is free for someone else now.
        </p>
      )}
    </PublicLayout>
  );
}
