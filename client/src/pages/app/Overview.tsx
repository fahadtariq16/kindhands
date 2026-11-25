import { Link, useSearchParams } from "react-router";
import { CalendarPlus, CalendarDays, Check, Share2, UserPlus } from "lucide-react";
import type { DashboardData } from "@kindhands/shared";
import { CopyField, Empty, ErrorBox, Spinner } from "../../components/ui";
import { useApi } from "../../lib/useApi";
import { useAuth } from "../../lib/auth";
import { timeAgo } from "../../lib/format";
import { ShiftRow } from "./ShiftRow";

export function Overview() {
  const { me } = useAuth();
  const [params] = useSearchParams();
  const { data, error, loading } = useApi<DashboardData>("/dashboard");

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox message={error?.message ?? "Couldn't load the dashboard"} />;

  const publicUrl = `${window.location.origin}/o/${me!.org.slug}`;
  const isNew = data.nextShifts.length === 0 && data.volunteers === 0;

  return (
    <div className="ui-page">
      <div className="ui-head">
        <div>
          <h1>{params.get("welcome") ? `Welcome, ${me!.user.name.split(" ")[0]}!` : `Hi, ${me!.user.name.split(" ")[0]}`}</h1>
          <p>Here's what's happening at {me!.org.name}.</p>
        </div>
        <Link to="/app/shifts/new" className="btn btn-grad">
          <CalendarPlus size={17} aria-hidden="true" /> New shift
        </Link>
      </div>

      {isNew && (
        <section className="ui-card" aria-labelledby="start-title">
          <h2 id="start-title">Get started in 3 steps</h2>
          <ol className="ui-list" style={{ marginTop: 16 }}>
            <Step done={false} icon={CalendarPlus} title="Create your first shift" to="/app/shifts/new" action="Create shift" />
            <Step done={false} icon={Share2} title="Share your sign-up link with volunteers" />
            <Step done={false} icon={UserPlus} title="Invite a coordinator to help (optional)" to="/app/team" action="Invite" />
          </ol>
          <div style={{ marginTop: 16 }}>
            <CopyField value={publicUrl} label="Your public sign-up link" />
          </div>
        </section>
      )}

      <div className="ui-grid">
        <Stat label="Shifts in the next 7 days" value={data.upcomingShifts} />
        <Stat label="Open spots in the next 7 days" value={data.openSpots} />
        <Stat label="Volunteers" value={data.volunteers} />
        <Stat label="Hours this month" value={data.hoursThisMonth} />
      </div>

      <div className="ui-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))" }}>
        <section className="ui-card" aria-labelledby="next-title">
          <div className="ui-card-head">
            <h2 id="next-title">Coming up</h2>
            <Link to="/app/shifts" className="btn-link">
              All shifts
            </Link>
          </div>
          {data.nextShifts.length ? (
            <ul className="ui-list">
              {data.nextShifts.map((s) => (
                <ShiftRow key={s.id} shift={s} showDay />
              ))}
            </ul>
          ) : (
            <Empty icon={CalendarDays} title="No upcoming shifts">
              <Link to="/app/shifts/new" className="btn btn-glass btn-sm">
                Create one
              </Link>
            </Empty>
          )}
        </section>

        <section className="ui-card" aria-labelledby="recent-title">
          <div className="ui-card-head">
            <h2 id="recent-title">Latest sign-ups</h2>
          </div>
          {data.recentSignups.length ? (
            <ul className="ui-list">
              {data.recentSignups.map((r, i) => (
                <li key={i}>
                  <Link to={`/app/shifts/${r.shiftId}`} className="ui-list-item">
                    <span>
                      <strong style={{ fontWeight: 500 }}>{r.name}</strong>{" "}
                      <span className="ui-soft">took {r.shiftTitle}</span>
                    </span>
                    <span className="ui-muted" style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                      {timeAgo(r.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={Share2} title="No sign-ups yet">
              <p style={{ fontSize: "0.9375rem" }}>Share your sign-up link and they'll appear here.</p>
            </Empty>
          )}
          {!isNew && (
            <div style={{ marginTop: 16 }}>
              <CopyField value={publicUrl} label="Your public sign-up link" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="ui-card ui-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Step({
  done,
  icon: Icon,
  title,
  to,
  action,
}: {
  done: boolean;
  icon: typeof Check;
  title: string;
  to?: string;
  action?: string;
}) {
  return (
    <li className="ui-list-item">
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="ui-badge violet" style={{ padding: 6 }}>
          {done ? <Check size={15} aria-hidden="true" /> : <Icon size={15} aria-hidden="true" />}
        </span>
        {title}
      </span>
      {to && action && (
        <Link to={to} className="btn btn-glass btn-sm">
          {action}
        </Link>
      )}
    </li>
  );
}
