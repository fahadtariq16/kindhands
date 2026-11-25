import { Check, Lock } from "lucide-react";
import { Reveal, trackSpotlight } from "../components/motion";
import styles from "./Privacy.module.css";

const POINTS = [
  "Data stored on servers in the EU",
  "Volunteers can ask for their data to be deleted, and it is",
  "No ads, no tracking pixels, no selling data",
  "Export everything, any time. Your data stays yours.",
];

export function Privacy() {
  return (
    <section className="section" aria-labelledby="privacy-title">
      <div className="container">
        <Reveal className={`glass spotlight ${styles.card}`} onMouseMove={trackSpotlight}>
          <div className={styles.visual} aria-hidden="true">
            <div className={styles.ring} />
            <div className={styles.ring2} />
            <div className={styles.core}>
              <Lock size={30} />
              <span>EU</span>
            </div>
          </div>
          <div>
            <p className="eyebrow">Privacy first</p>
            <h2 id="privacy-title" className={`section-title ${styles.title}`}>
              Your volunteers trust you. <span className="serif">We take that seriously.</span>
            </h2>
            <ul className={styles.list}>
              {POINTS.map((p) => (
                <li key={p}>
                  <span className={styles.check}>
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
