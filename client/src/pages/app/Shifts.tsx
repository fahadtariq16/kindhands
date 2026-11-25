import { useState } from "react";
import { Link } from "react-router";
import { CalendarDays, CalendarPlus } from "lucide-react";
import type { ShiftSummary } from "@kindhands/shared";
import { Empty, ErrorBox, Spinner } from "../../components/ui";
import { useApi } from "../../lib/useApi";
import { groupByDay } from "../../lib/format";
import { ShiftRow } from "./ShiftRow";

export function Shifts() {
  const [range, setRange] = useState<"upcoming" | "past">("upcoming");
  const { data, error, loading } = useApi<ShiftSummary[]>(`/shifts?range=${range}`);

  return (
    <div className="ui-page">
      <div className="ui-head">
        <div>
          <h1>Shifts</h1>
          <p>Create shifts, see who's coming and check people in.</p>
        </div>
        <Link to="/app/shifts/new" className="btn btn-grad">
          <CalendarPlus size={17} aria-hidden="true" /> New shift
        </Link>
      </div>

      <div className="ui-tabs" role="group" aria-label="Show shifts">
        <button type="button" aria-pressed={range === "upcoming"} onClick={() => setRange("upcoming")}>
          Upcoming
        </button>
        <button type="button" aria-pressed={range === "past"} onClick={() => setRange("past")}>
          Past
        </button>
      </div>

      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error.message} />
      ) : !data?.length ? (
        <Empty icon={CalendarDays} title={range === "upcoming" ? "No upcoming shifts" : "No past shifts yet"}>
          {range === "upcoming" && (
            <Link to="/app/shifts/new" className="btn btn-glass btn-sm">
              Create your first shift
            </Link>
          )}
        </Empty>
      ) : (
        <div>
          {groupByDay(data).map((g) => (
            <section key={g.day} aria-label={g.day}>
              <h2 className="ui-day">{g.day}</h2>
              <ul className="ui-list">
                {g.items.map((s) => (
                  <ShiftRow key={s.id} shift={s} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
