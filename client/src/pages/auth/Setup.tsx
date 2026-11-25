import { Link, useNavigate, useSearchParams } from "react-router";
import { setupSchema, type InviteInfo } from "@kindhands/shared";
import { AuthLayout } from "./AuthLayout";
import { ErrorBox, Field, Spinner } from "../../components/ui";
import { api } from "../../api/client";
import { useApi } from "../../lib/useApi";
import { useAuth } from "../../lib/auth";
import { formValues, useForm } from "../../lib/forms";

/** Opened from the email sent after joining the waitlist: creates the organisation and admin account. */
export function Setup() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const invite = useApi<InviteInfo>(token ? `/auth/invites/${encodeURIComponent(token)}` : null);
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const { errors, formError, busy, submit } = useForm(setupSchema);

  if (!token || invite.error) {
    return (
      <AuthLayout title="This link doesn't work" subtitle={invite.error?.message ?? "The setup link is missing its code."}>
        <p className="ui-soft">
          Already set up? <Link to="/login">Log in</Link>. Otherwise <a href="/#waitlist">join the waitlist</a> again to get a new link.
        </p>
      </AuthLayout>
    );
  }
  if (invite.loading || !invite.data) return <Spinner />;
  const inv = invite.data;
  if (inv.kind !== "org-setup") {
    return (
      <AuthLayout title="Wrong kind of link" subtitle="This is a team invitation.">
        <Link className="btn btn-primary" to={`/invite?token=${encodeURIComponent(token)}`}>
          Accept the invitation instead
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={
        <>
          Set up <span className="serif">your organisation</span>
        </>
      }
      subtitle={`Signing up as ${inv.email}. This takes about a minute.`}
    >
      <form
        className="ui-form"
        noValidate
        onSubmit={(e) =>
          submit(e, { ...formValues(e.currentTarget), token }, async (data) => {
            await api("/auth/setup", { body: data });
            await refresh();
            navigate("/app?welcome=1");
          })
        }
      >
        <Field name="organisation" label="Organisation name" defaultValue={inv.organisation} error={errors.organisation} />
        <Field name="name" label="Your name" autoComplete="name" defaultValue={inv.name ?? ""} error={errors.name} />
        <Field
          name="password"
          label="Choose a password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          error={errors.password}
        />
        {formError && <ErrorBox message={formError} />}
        <button className="btn btn-grad" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create my organisation"}
        </button>
      </form>
    </AuthLayout>
  );
}
