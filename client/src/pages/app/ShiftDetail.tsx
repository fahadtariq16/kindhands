import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Clock, MapPin, Pencil, UserPlus, Users } from "lucide-react";
import { volunteerSignupSchema, type ShiftDetail } from "@kindhands/shared";
import { ConfirmButton, Empty, ErrorBox, Field, SpotsBar, Spinner } from "../../components/ui";
import { api } from "../../api/client";
import { useApi } from "../../lib/useApi";
import { formValues, useForm } from "../../lib/forms";
import { fmtLongDay, fmtRange, hours } from "../../lib/format";

export function ShiftDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: shift, error, loading, reload, setData } = useApi<ShiftDetail>(`/shifts/${id}`);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const add = useForm(volunteerSignupSchema);

  if (loading && !shift) return <Spinner />;
  if (error || !shift) return <ErrorBox message={error?.message ?? "Shift not found"} />;

  const confirmed = shift.signups.filter((s) => s.status === "confirmed");
  const cancelled = shift.signups.filter((s) => s.status === "cancelled");
  const checkedIn = confirmed.filter((s) => s.checkedIn).length;
  const started = new Date(shift.startsAt) <= new Date();
  const full = shift.filled >= shift.spots;

  // Optimistic: tick the box immediately, then save. If saving fails, reload the real state.
  async function toggleCheckIn(signupId: number, checkedIn: boolean) {
    setData((prev) =>
      prev ? { ...prev, signups: prev.signups.map((s) => (s.id === signupId ? { ...s, checkedIn } : s)) } : prev,
    );
    try {
      await api(`/shifts/${shift!.id}/signups/${signupId}/check-in`, { body: { checkedIn } });
    } catch {
      await reload();
    }
  }

  return (
    <div className="ui-page">
      <Link to="/app/shifts" className="btn-link" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <ArrowLeft size={15} aria-hidden="true" /> All shifts
      </Link>

      <div className="ui-head">
        <div>
          <h1>{shift.title}</h1>
          <p style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Clock size={15} aria-hidden="true" /> {fmtLongDay(shift.startsAt)}, {fmtRange(shift.startsAt, shift.endsAt)} ·{" "}
              {hours(shift.startsAt, shift.endsAt)} h
            </span>
            {shift.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <MapPin size={15} aria-hidden="true" /> {shift.location}
              </span>
            )}
          </p>
        </div>
        <div className="ui-actions">
          <Link to={`/app/shifts/${shift.id}/edit`} className="btn btn-glass btn-sm">
            <Pencil size={15} aria-hidden="true" /> Edit
          </Link>
          {shift.seriesId && (
            <ConfirmButton
              confirmLabel="Delete this and later repeats"
              onConfirm={async () => {
                await api(`/shifts/${shift.id}?series=true`, { method: "DELETE" });
                navigate("/app/shifts");
              }}
            >
              Delete series
            </ConfirmButton>
          )}
          <ConfirmButton
            confirmLabel={confirmed.length ? `Delete and email ${confirmed.length}` : "Delete shift"}
            onConfirm={async () => {
              await api(`/shifts/${shift.id}`, { method: "DELETE" });
              navigate("/app/shifts");
            }}
          >
            Delete
          </ConfirmButton>
        </div>
      </div>

      {shift.description && (
        <p className="ui-card ui-soft" style={{ whiteSpace: "pre-line" }}>
          {shift.description}
        </p>
      )}

      <div className="ui-grid">
        <div className="ui-card ui-stat">
          <span>Booked</span>
          <strong>
            {shift.filled}
            <span className="ui-muted" style={{ fontSize: "1.25rem" }}>
              /{shift.spots}
            </span>
          </strong>
          <SpotsBar filled={shift.filled} spots={shift.spots} />
        </div>
        <div className="ui-card ui-stat">
          <span>Checked in</span>
          <strong>{checkedIn}</strong>
        </div>
        <div className="ui-card ui-stat">
          <span>Hours given</span>
          <strong>{Math.round(checkedIn * hours(shift.startsAt, shift.endsAt) * 10) / 10}</strong>
        </div>
      </div>

      {notice && (
        <p className="ui-note" role="status">
          {notice}
        </p>
      )}

      <section className="ui-card" aria-labelledby="people-title">
        <div className="ui-card-head">
          <h2 id="people-title">Volunteers</h2>
          {!started && !full && !adding && (
            <button type="button" className="btn btn-glass btn-sm" onClick={() => setAdding(true)}>
              <UserPlus size={15} aria-hidden="true" /> Add someone
            </button>
          )}
        </div>

        {adding && (
          <form
            className="ui-form"
            style={{ marginBottom: 20 }}
            noValidate
            onSubmit={(e) =>
              add.submit(e, formValues(e.currentTarget), async (data) => {
                await api(`/shifts/${shift.id}/signups`, { body: data });
                setAdding(false);
                setNotice(`${data.name} is booked. We emailed them the details.`);
                await reload();
              })
            }
          >
            <div className="ui-row">
              <Field name="name" label="Name" error={add.errors.name} autoFocus />
              <Field name="email" label="Email" type="email" error={add.errors.email} />
            </div>
            {add.formError && <ErrorBox message={add.formError} />}
            <div className="ui-actions">
              <button type="submit" className="btn btn-grad btn-sm" disabled={add.busy}>
                {add.busy ? "Adding…" : "Add and email them"}
              </button>
              <button type="button" className="btn btn-glass btn-sm" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {confirmed.length === 0 ? (
          <Empty icon={Users} title="Nobody booked yet">
            <p style={{ fontSize: "0.9375rem" }}>Share your sign-up page, or add someone yourself.</p>
          </Empty>
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Checked in</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {confirmed.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="ui-soft">{p.email}</td>
                    <td>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", minHeight: 44 }}>
                        <input
                          type="checkbox"
                          checked={p.checkedIn}
                          onChange={(e) => toggleCheckIn(p.id, e.target.checked)}
                          style={{ width: 20, height: 20, accentColor: "var(--violet)" }}
                        />
                        <span className={p.checkedIn ? "ui-badge ok" : "ui-muted"}>{p.checkedIn ? "Here" : "Not yet"}</span>
                        <span className="visually-hidden">Check in {p.name}</span>
                      </label>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <ConfirmButton
                        confirmLabel={started ? "Remove" : "Remove and email"}
                        onConfirm={async () => {
                          await api(`/shifts/${shift.id}/signups/${p.id}`, { method: "DELETE" });
                          await reload();
                        }}
                      >
                        Remove
                      </ConfirmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {cancelled.length > 0 && (
          <p className="ui-muted" style={{ marginTop: 14, fontSize: "0.875rem" }}>
            Cancelled: {cancelled.map((c) => c.name).join(", ")}
          </p>
        )}
      </section>
    </div>
  );
}
