import { Link } from "react-router";
import { AuthLayout } from "./auth/AuthLayout";

export function NotFound() {
  return (
    <AuthLayout title="Page not found" subtitle="The link may be old or mistyped.">
      <Link to="/" className="btn btn-primary">
        Go to the home page
      </Link>
    </AuthLayout>
  );
}
