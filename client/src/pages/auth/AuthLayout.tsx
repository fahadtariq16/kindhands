import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "../../components/Logo";
import styles from "./AuthLayout.module.css";

/** Centered glass card on the glowing background, used by login, setup and invite pages. */
export function AuthLayout({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.orbA} />
        <div className={styles.orbB} />
      </div>
      <main className={styles.main}>
        <Link to="/" className={styles.logo} aria-label="Kindhands home">
          <Logo />
        </Link>
        <div className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          <div className={styles.body}>{children}</div>
        </div>
      </main>
    </div>
  );
}
