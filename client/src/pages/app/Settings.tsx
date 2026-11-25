import { useState } from "react";
import { orgSettingsSchema } from "@kindhands/shared";
import { CopyField, ErrorBox, Field } from "../../components/ui";
import { api } from "../../api/client";
import { useAuth } from "../../lib/auth";
import { formValues, useForm } from "../../lib/forms";

export function Settings() {
  const { me, refresh } = useAuth();
  const { errors, formError, busy, submit } = useForm(orgSettingsSchema);
  const [saved, setSaved] = useState(false);
  const isAdmin = me!.role === "admin";
  const publicUrl = `${window.location.origin}/o/${me!.org.slug}`;

  return (
    <div className="ui-page" style={{ maxWidth: 720 }}>
      <div className="ui-head">
        <div>
          <h1>Settings</h1>
          <p>Your organisation's name and public sign-up link.</p>
        </div>
      </div>

      <section className="ui-card" aria-labelledby="link-title">
        <h2 id="link-title" style={{ marginBottom: 6 }}>
          Your sign-up page
        </h2>
        <p className="ui-soft" style={{ marginBottom: 14, fontSize: "0.9375rem" }}>
          Share this link anywhere: newsletter, social media, group chat or your website. Volunteers don't need an account.
        </p>
        <CopyField value={publicUrl} label="Public sign-up link" />
      </section>

      <section className="ui-card" aria-labelledby="org-title">
        <h2 id="org-title" style={{ marginBottom: 16 }}>
          Organisation
        </h2>
        {isAdmin ? (
          <form
            className="ui-form"
            noValidate
            onSubmit={(e) =>
              submit(e, formValues(e.currentTarget), async (data) => {
                setSaved(false);
                await api("/org", { method: "PUT", body: data });
                await refresh();
                setSaved(true);
              })
            }
          >
            <Field name="name" label="Name" defaultValue={me!.org.name} error={errors.name} />
            <Field
              name="slug"
              label="Link name"
              defaultValue={me!.org.slug}
              hint={`Your page will be ${window.location.origin}/o/your-link-name. Changing it breaks the old link.`}
              error={errors.slug}
            />
            {formError && <ErrorBox message={formError} />}
            {saved && (
              <p className="ui-note" role="status">
                Saved.
              </p>
            )}
            <div>
              <button type="submit" className="btn btn-grad" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <p className="ui-soft">{me!.org.name}. Only admins can change these settings.</p>
        )}
      </section>

      <p className="ui-muted" style={{ fontSize: "0.875rem" }}>
        Times in emails use the {me!.org.timezone.replace("_", " ")} timezone.
      </p>
    </div>
  );
}
