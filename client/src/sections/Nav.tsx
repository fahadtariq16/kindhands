import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../lib/auth";
import { Logo } from "../components/Logo";
import styles from "./Nav.module.css";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));
  const close = () => setOpen(false);
  const { me } = useAuth();

  return (
    <motion.header
      className={styles.header}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className={`${styles.nav} ${scrolled || open ? styles.scrolled : ""}`} aria-label="Main">
        <a href="#top" className={styles.brand} aria-label="Kindhands home" onClick={close}>
          <Logo />
        </a>

        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="nav-links"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>

        <div id="nav-links" className={`${styles.links} ${open ? styles.open : ""}`}>
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={close}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          {me ? (
            <Link to="/app" className={`btn btn-primary ${styles.cta}`}>
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className={styles.login}>
                Log in
              </Link>
              <a href="#waitlist" className={`btn btn-primary ${styles.cta}`} onClick={close}>
                Join the waitlist
              </a>
            </>
          )}
        </div>
      </nav>
    </motion.header>
  );
}
