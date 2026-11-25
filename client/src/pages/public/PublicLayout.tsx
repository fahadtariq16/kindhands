import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "../../components/Logo";

/** Simple page frame for volunteer-facing pages. */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(900px 480px at 50% -12%, rgba(106, 77, 255, 0.28), transparent), var(--bg)",
      }}
    >
      <main id="main" className="container" style={{ maxWidth: 760, padding: "40px 0 72px" }}>
        {children}
        <p className="ui-muted" style={{ marginTop: 56, fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: 8 }}>
          Shift sign-up by{" "}
          <Link to="/" style={{ textDecoration: "none" }}>
            <Logo />
          </Link>
        </p>
      </main>
    </div>
  );
}
