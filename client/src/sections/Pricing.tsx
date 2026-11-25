import { Check } from "lucide-react";
import { Reveal, trackSpotlight } from "../components/motion";
import styles from "./Pricing.module.css";

interface Plan {
  name: string;
  price: string;
  note: string;
  features: string[];
  cta: string;
  featured?: boolean;
}

// Prices are deliberately not set yet: decide them before launch.
const PLANS: Plan[] = [
  {
    name: "Beta",
    price: "Free",
    note: "For early partners while we build together",
    features: ["Unlimited shifts", "Up to 50 volunteers", "Email reminders", "Direct line to the founder"],
    cta: "Join the beta",
    featured: true,
  },
  {
    name: "Charity",
    price: "Coming soon",
    note: "For growing volunteer programmes",
    features: ["Unlimited volunteers", "Recurring shifts", "Hours reports and export", "Coordinator roles"],
    cta: "Get notified",
  },
  {
    name: "Events",
    price: "Custom",
    note: "For festivals with hundreds of volunteers",
    features: ["Everything in Charity", "QR check-in on the day", "Team leads per area", "Setup help"],
    cta: "Talk to us",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="section" aria-labelledby="pricing-title">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">Pricing</p>
          <h2 id="pricing-title" className="section-title">
            Fair pricing for teams that <span className="serif">run on goodwill.</span>
          </h2>
        </Reveal>
        <ul className={styles.grid}>
          {PLANS.map((p, i) => (
            <li key={p.name} className={styles.item}>
              <Reveal delay={i * 0.1} className={styles.revealFill}>
                <div
                  className={`spotlight ${styles.card} ${p.featured ? styles.featured : "glass"}`}
                  onMouseMove={trackSpotlight}
                >
                  {p.featured && <span className={styles.tag}>Open now</span>}
                  <h3 className={styles.name}>{p.name}</h3>
                  <p className={styles.price}>{p.price}</p>
                  <p className={styles.note}>{p.note}</p>
                  <ul className={styles.features}>
                    {p.features.map((f) => (
                      <li key={f}>
                        <Check size={15} strokeWidth={2.5} aria-hidden="true" /> {f}
                      </li>
                    ))}
                  </ul>
                  <a href="#waitlist" className={`btn ${p.featured ? "btn-primary" : "btn-glass"} ${styles.cta}`}>
                    {p.cta}
                  </a>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
