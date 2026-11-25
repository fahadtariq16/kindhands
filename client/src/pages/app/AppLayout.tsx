import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { CalendarDays, LayoutDashboard, LogOut, Menu, Settings, Users, UsersRound, X, ExternalLink } from "lucide-react";
import { Logo } from "../../components/Logo";
import { Spinner } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import styles from "./AppLayout.module.css";

const NAV = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/shifts", label: "Shifts", icon: CalendarDays },
  { to: "/app/volunteers", label: "Volunteers", icon: Users },
  { to: "/app/team", label: "Team", icon: UsersRound },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppLayout() {
  const { me, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);

  if (loading) return <Spinner />;
  if (!me) return <Navigate to="/login" replace />;

  return (
    <div className={styles.shell}>
      <aside className={`${styles.side} ${open ? styles.open : ""}`}>
        <div className={styles.sideTop}>
          <Logo />
          <button
            type="button"
            className={styles.menuBtn}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="app-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>

        <div id="app-nav" className={styles.navWrap}>
          <div className={styles.org}>
            <span className={styles.orgBadge} aria-hidden="true">
              {me.org.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <p className={styles.orgName}>{me.org.name}</p>
              <p className={styles.orgRole}>{me.role === "admin" ? "Admin" : "Coordinator"}</p>
            </div>
          </div>

          <nav aria-label="Dashboard">
            <ul className={styles.nav}>
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink to={to} end={end} className={({ isActive }) => (isActive ? styles.active : undefined)}>
                    <Icon size={18} aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <a className={styles.publicLink} href={`/o/${me.org.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink size={15} aria-hidden="true" /> Your sign-up page
          </a>

          <div className={styles.user}>
            <div>
              <p className={styles.userName}>{me.user.name}</p>
              <p className={styles.userEmail}>{me.user.email}</p>
            </div>
            <button
              type="button"
              className={styles.logout}
              aria-label="Log out"
              title="Log out"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.main} id="main">
        <Outlet />
      </main>
    </div>
  );
}
