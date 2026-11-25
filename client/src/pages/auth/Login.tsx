import { Navigate, useNavigate } from "react-router";
import { loginSchema } from "@kindhands/shared";
import { AuthLayout } from "./AuthLayout";
import { Field, ErrorBox } from "../../components/ui";
import { api } from "../../api/client";
import { useAuth } from "../../lib/auth";
import { formValues, useForm } from "../../lib/forms";

export function Login() {
  const { me, refresh } = useAuth();
  const navigate = useNavigate();
  const { errors, formError, busy, submit } = useForm(loginSchema);

  if (me) return <Navigate to="/app" replace />;

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to manage your shifts and volunteers.">
      <form
        className="ui-form"
        noValidate
        onSubmit={(e) =>
          submit(e, formValues(e.currentTarget), async (data) => {
            await api("/auth/login", { body: data });
            await refresh();
            navigate("/app");
          })
        }
      >
        <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
        <Field name="password" label="Password" type="password" autoComplete="current-password" error={errors.password} />
        {formError && <ErrorBox message={formError} />}
        <button className="btn btn-grad" type="submit" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
        <p className="ui-soft" style={{ fontSize: "0.9375rem" }}>
          New here? <a href="/#waitlist">Join the waitlist</a> to get your setup link.
        </p>
      </form>
    </AuthLayout>
  );
}
