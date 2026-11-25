import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { shiftSchema, shiftUpdateSchema, type ShiftDetail, type ShiftSummary } from "@kindhands/shared";
import { ErrorBox, Field, Select, Spinner, TextArea } from "../../components/ui";
import { api } from "../../api/client";
import { useApi } from "../../lib/useApi";
import { formValues, useForm } from "../../lib/forms";

const pad = (n: number) => String(n).padStart(2, "0");
const dateValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeValue = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Date + start/end time inputs → ISO strings. An end time before the start means "next day". */
function toRange(date: string, start: string, end: string) {
  if (!date || !start || !end) return { startsAt: "", endsAt: "" };
  const s = new Date(`${date}T${start}`);
  const e = new Date(`${date}T${end}`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return { startsAt: "", endsAt: "" };
  if (e <= s) e.setDate(e.getDate() + 1);
  return { startsAt: s.toISOString(), endsAt: e.toISOString() };
}

/** Create a new shift (/app/shifts/new) or edit one (/app/shifts/:id/edit). */
export function ShiftEditor() {
  const { id } = useParams();
  const editing = Boolean(id);
  const existing = useApi<ShiftDetail>(editing ? `/shifts/${id}` : null);
  const navigate = useNavigate();
  const create = useForm(shiftSchema);
  const update = useForm(shiftUpdateSchema);
  const { errors, formError, busy } = editing ? update : create;

  if (editing && existing.loading) return <Spinner />;
  if (editing && (existing.error || !existing.data)) return <ErrorBox message={existing.error?.message ?? "Shift not found"} />;

  const s = existing.data;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const start = s ? new Date(s.startsAt) : tomorrow;
  const end = s ? new Date(s.endsAt) : new Date(tomorrow.getTime() + 3 * 3_600_000);

  return (
    <div className="ui-page" style={{ maxWidth: 720 }}>
      <Link to={editing ? `/app/shifts/${id}` : "/app/shifts"} className="btn-link" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <ArrowLeft size={15} aria-hidden="true" /> Back
      </Link>
      <div className="ui-head">
        <div>
          <h1>{editing ? "Edit shift" : "New shift"}</h1>
          <p>{editing ? "Booked volunteers keep their place." : "Volunteers will see this on your sign-up page."}</p>
        </div>
      </div>

      <form
        className="ui-card ui-form"
        noValidate
        onSubmit={(e) => {
          const v = formValues(e.currentTarget);
          const raw = { ...v, ...toRange(v.date, v.start, v.end) };
          if (editing) {
            return update.submit(e, raw, async (data) => {
              await api(`/shifts/${id}`, { method: "PUT", body: data });
              navigate(`/app/shifts/${id}`);
            });
          }
          return create.submit(e, raw, async (data) => {
            const created = await api<ShiftSummary[]>("/shifts", { body: data });
            navigate(created.length > 1 ? "/app/shifts" : `/app/shifts/${created[0].id}`);
          });
        }}
      >
        <Field name="title" label="What's the shift?" placeholder="e.g. Food sorting" defaultValue={s?.title} error={errors.title} />
        <div className="ui-row">
          <Field name="date" label="Date" type="date" defaultValue={dateValue(start)} error={errors.startsAt} />
          <Field name="start" label="Starts" type="time" defaultValue={timeValue(start)} />
          <Field name="end" label="Ends" type="time" defaultValue={timeValue(end)} error={errors.endsAt} />
        </div>
        <div className="ui-row">
          <Field name="location" label="Where (optional)" placeholder="e.g. Warehouse, Telliskivi 60" defaultValue={s?.location} error={errors.location} />
          <Field
            name="spots"
            label="Volunteers needed"
            type="number"
            min={1}
            max={500}
            inputMode="numeric"
            defaultValue={s?.spots ?? 4}
            error={errors.spots}
          />
        </div>
        <TextArea
          name="description"
          label="Details for volunteers (optional)"
          placeholder="What to bring, who to ask for, where to park…"
          defaultValue={s?.description}
          error={errors.description}
        />
        {!editing && (
          <Select name="repeatWeeks" label="Repeat" defaultValue="0" error={errors.repeatWeeks}>
            <option value="0">Just once</option>
            <option value="3">Every week for 4 weeks</option>
            <option value="7">Every week for 8 weeks</option>
            <option value="11">Every week for 12 weeks</option>
          </Select>
        )}
        {formError && <ErrorBox message={formError} />}
        <div className="ui-actions">
          <button type="submit" className="btn btn-grad" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Create shift"}
          </button>
          <Link to={editing ? `/app/shifts/${id}` : "/app/shifts"} className="btn btn-glass">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
