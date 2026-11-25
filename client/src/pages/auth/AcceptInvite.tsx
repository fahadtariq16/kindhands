import { Link, useNavigate, useSearchParams } from "react-router";
import { acceptInviteSchema, type InviteInfo } from "@kindhands/shared";
import { AuthLayout } from "./AuthLayout";
import { ErrorBox, Field, Spinner } from "../../components/ui";
import { api } from "../../api/client";
import { useApi } from "../../lib/useApi";
import { useAuth } from "../../lib/auth";
import { formValues, useForm } from "../../lib/forms";

/** Opened from a team invitation email. */
export function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const invite = useApi<InviteInfo>(token ? `/auth/invites/${encodeURIComponent(token)}` : null);
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const { errors, formError, busy, submit } = useForm(acceptInviteSchema);

  if (!token || invite.error) {
    return (
      <AuthLayout title="This invitation doesn't work" subtitle={invite.error?.message ?? "The link is missing its code."}>
        <p className="ui-soft">
          Ask your team admin to send a new invitation, or <Link to="/login">log in</Link> if you already joined.
        </p>
      </AuthLayout>
    );
  }
  if (invite.loading || !invite.data) return <Spinner />;
  const inv = invite.data;

  return (
    <AuthLayout
      title={
        <>
          Join <span className="serif">{inv.organisation}</span>
        </>
      }
      subtitle={`You've been invited as ${inv.role === "admin" ? "an admin" : "a coordinator"} (${inv.email}).`}
    >
      <form
        className="ui-form"
        noValidate
        onSubmit={(e) =>
          submit(e, { ...formValues(e.currentTarget), token }, async (data) => {
            await api("/auth/accept-invite", { body: data });
            await refresh();
            navigate("/app");
          })
        }
      >
        <Field name="name" label="Your name" autoComplete="name" error={errors.name} />
        <Field
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="New here? Choose a password (8+ characters). Already have an account? Use your existing password."
          error={errors.password}
        />
        {formError && <ErrorBox message={formError} />}
        <button className="btn btn-grad" type="submit" disabled={busy}>
          {busy ? "Joining…" : "Accept and join"}
        </button>
      </form>
    </AuthLayout>
  );
}
