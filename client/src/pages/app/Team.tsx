import { useState } from "react";
import { teamInviteSchema, type PendingInvite, type TeamMember } from "@kindhands/shared";
import { ConfirmButton, ErrorBox, Field, Select, Spinner } from "../../components/ui";
import { api } from "../../api/client";
import { useApi } from "../../lib/useApi";
import { useAuth } from "../../lib/auth";
import { formValues, useForm } from "../../lib/forms";
import { timeAgo } from "../../lib/format";

export function Team() {
  const { me } = useAuth();
  const { data, error, loading, reload } = useApi<{ members: TeamMember[]; invites: PendingInvite[] }>("/team");
  const invite = useForm(teamInviteSchema);
  const [notice, setNotice] = useState("");
  const isAdmin = me?.role === "admin";

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox message={error?.message ?? "Couldn't load your team"} />;

  return (
    <div className="ui-page" style={{ maxWidth: 860 }}>
      <div className="ui-head">
        <div>
          <h1>Team</h1>
          <p>Coordinators can manage shifts and volunteers. Admins can also change settings and the team.</p>
        </div>
      </div>

      {isAdmin && (
        <section className="ui-card" aria-labelledby="invite-title">
          <h2 id="invite-title" style={{ marginBottom: 16 }}>
            Invite someone
          </h2>
          <form
            className="ui-form"
            noValidate
            onSubmit={(e) => {
              const form = e.currentTarget;
              return invite.submit(e, formValues(form), async (d) => {
                await api("/team/invites", { body: d });
                setNotice(`Invitation sent to ${d.email}.`);
                form.reset();
                await reload();
              });
            }}
          >
            <div className="ui-row">
              <Field name="email" label="Email" type="email" error={invite.errors.email} />
              <Select name="role" label="Role" defaultValue="coordinator" error={invite.errors.role}>
                <option value="coordinator">Coordinator</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            {invite.formError && <ErrorBox message={invite.formError} />}
            {notice && (
              <p className="ui-note" role="status">
                {notice}
              </p>
            )}
            <div>
              <button className="btn btn-grad" type="submit" disabled={invite.busy}>
                {invite.busy ? "Sending…" : "Send invitation"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="ui-card" aria-labelledby="members-title">
        <h2 id="members-title" style={{ marginBottom: 16 }}>
          Members
        </h2>
        <ul className="ui-list">
          {data.members.map((m) => (
            <li key={m.userId} className="ui-list-item">
              <span>
                <strong style={{ fontWeight: 500 }}>{m.name}</strong>
                {m.userId === me?.user.id && <span className="ui-muted"> (you)</span>}
                <br />
                <span className="ui-muted" style={{ fontSize: "0.875rem" }}>
                  {m.email}
                </span>
              </span>
              <span className="ui-actions">
                <span className={`ui-badge ${m.role === "admin" ? "violet" : ""}`}>{m.role === "admin" ? "Admin" : "Coordinator"}</span>
                {isAdmin && m.userId !== me?.user.id && (
                  <ConfirmButton
                    confirmLabel="Remove from team"
                    onConfirm={async () => {
                      await api(`/team/members/${m.userId}`, { method: "DELETE" });
                      await reload();
                    }}
                  >
                    Remove
                  </ConfirmButton>
                )}
              </span>
            </li>
          ))}
        </ul>

        {data.invites.length > 0 && (
          <>
            <h3 className="ui-day" style={{ marginTop: 24 }}>
              Waiting to accept
            </h3>
            <ul className="ui-list">
              {data.invites.map((i) => (
                <li key={i.email + i.createdAt} className="ui-list-item">
                  <span>{i.email}</span>
                  <span className="ui-muted" style={{ fontSize: "0.875rem" }}>
                    {i.role} · invited {timeAgo(i.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
