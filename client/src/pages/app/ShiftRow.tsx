import { Link } from "react-router";
import { MapPin } from "lucide-react";
import type { ShiftSummary } from "@kindhands/shared";
import { SpotsBar } from "../../components/ui";
import { fmtDay, fmtRange } from "../../lib/format";

/** One shift in a list: title, time, place and how full it is. Links to the shift page. */
export function ShiftRow({ shift, showDay = false }: { shift: ShiftSummary; showDay?: boolean }) {
  const full = shift.filled >= shift.spots;
  return (
    <li>
      <Link to={`/app/shifts/${shift.id}`} className="ui-list-item">
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 500 }}>{shift.title}</p>
          <p className="ui-muted" style={{ fontSize: "0.875rem", display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
            <span>
              {showDay ? `${fmtDay(shift.startsAt)} · ` : ""}
              {fmtRange(shift.startsAt, shift.endsAt)}
            </span>
            {shift.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <MapPin size={13} aria-hidden="true" /> {shift.location}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "grid", justifyItems: "end", gap: 6, flex: "none" }}>
          <span className={`ui-badge ${full ? "ok" : shift.filled === 0 ? "warn" : ""}`}>
            {shift.filled}/{shift.spots} {full ? "full" : "filled"}
          </span>
          <SpotsBar filled={shift.filled} spots={shift.spots} />
        </div>
      </Link>
    </li>
  );
}
