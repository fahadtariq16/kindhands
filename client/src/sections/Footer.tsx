import { Logo } from "../components/Logo";
import { BRAND } from "../brand";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div>
          <Logo />
          <p className={styles.tag}>{BRAND.tagline}</p>
        </div>
        <nav aria-label="Footer">
          <ul className={styles.links}>
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#pricing">Pricing</a>
            </li>
            <li>
              <a href="#faq">FAQ</a>
            </li>
            <li>
              <a href={`mailto:${BRAND.contactEmail}`}>Contact</a>
            </li>
          </ul>
        </nav>
      </div>
      <p className={styles.wordmark} aria-hidden="true">
        {BRAND.name}
      </p>
      <div className={`container ${styles.bottom}`}>
        <p>
          © {BRAND.year} {BRAND.name}. Made in Tallinn.
        </p>
      </div>
    </footer>
  );
}
