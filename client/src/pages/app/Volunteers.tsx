import { useMemo, useState } from "react";
import { Download, Search, Users } from "lucide-react";
import type { VolunteerRow } from "@kindhands/shared";
import { ConfirmButton, Empty, ErrorBox, Spinner } from "../../components/ui";
import { apiUrl, api } from "../../api/client";
import { useApi } from "../../lib/useApi";
import { useAuth } from "../../lib/auth";
import { fmtDay } from "../../lib/format";

export function Volunteers() {
  const { me } = useAuth();
  const { data, error, loading, reload } = useApi<VolunteerRow[]>("/volunteers");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((v) => !q || v.name.toLowerCase().includes(q) || v.email.includes(q));
  }, [data, query]);

  const totalHours = Math.round((data ?? []).reduce((sum, v) => sum + v.hours, 0) * 10) / 10;

  return (
    <div className="ui-page">
      <div className="ui-head">
        <div>
          <h1>Volunteers</h1>
          <p>
            Everyone who has signed up for a shift
            {data?.length ? ` · ${data.length} people · ${totalHours} hours checked in` : ""}.
          </p>
        </div>
        {data?.length ? (
          <a className="btn btn-glass" href={apiUrl("/volunteers/export.csv")} download>
            <Download size={16} aria-hidden="true" /> Export CSV
          </a>
        ) : null}
      </div>

      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error.message} />
      ) : !data?.length ? (
        <Empty icon={Users} title="No volunteers yet">
          <p style={{ fontSize: "0.9375rem" }}>When people sign up for a shift, they'll appear here automatically.</p>
        </Empty>
      ) : (
        <>
          <div style={{ position: "relative", maxWidth: 360 }}>
            <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 14, top: 15, color: "var(--text-dim)" }} />
            <input
              className="ui-input"
              style={{ paddingLeft: 40, minHeight: 46 }}
              type="search"
              placeholder="Search by name or email"
              aria-label="Search volunteers"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col" className="num">
                    Shifts
                  </th>
                  <th scope="col" className="num">
                    Hours
                  </th>
                  <th scope="col">Last shift</th>
                  {me?.role === "admin" && (
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id}>
                    <td>{v.name}</td>
                    <td className="ui-soft">{v.email}</td>
                    <td className="num">{v.shifts}</td>
                    <td className="num">{v.hours}</td>
                    <td className="ui-soft">{v.lastShiftAt ? fmtDay(v.lastShiftAt) : "–"}</td>
                    {me?.role === "admin" && (
                      <td style={{ textAlign: "right" }}>
                        <ConfirmButton
                          confirmLabel="Delete all their data"
                          onConfirm={async () => {
                            await api(`/volunteers/${v.id}`, { method: "DELETE" });
                            await reload();
                          }}
                        >
                          Delete
                        </ConfirmButton>
                      </td>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="ui-muted">
                      Nobody matches "{query}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="ui-muted" style={{ fontSize: "0.875rem" }}>
            Deleting a volunteer removes their details and bookings for good (GDPR right to erasure).
          </p>
        </>
      )}
    </div>
  );
}
