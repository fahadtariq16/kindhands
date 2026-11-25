import { WaitlistForm } from "../components/WaitlistForm";
import { Reveal } from "../components/motion";
import styles from "./Waitlist.module.css";

export function Waitlist() {
  return (
    <section id="waitlist" className={`section ${styles.wrap}`} aria-labelledby="waitlist-title">
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.orbA} />
        <div className={styles.orbB} />
      </div>
      <div className={`container ${styles.grid}`}>
        <Reveal className={styles.copy}>
          <p className="eyebrow">Early access</p>
          <h2 id="waitlist-title" className={styles.title}>
            Be one of the <span className="serif">first on board.</span>
          </h2>
          <p className={styles.lead}>
            We're inviting charities and event teams in small groups. Beta partners use it free and help decide what
            we build next.
          </p>
        </Reveal>
        <Reveal delay={0.12}>
          <WaitlistForm />
        </Reveal>
      </div>
    </section>
  );
}
