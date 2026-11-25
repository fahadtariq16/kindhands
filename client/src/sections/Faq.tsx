import { FaqItem } from "../components/FaqItem";
import { BRAND } from "../brand";
import { Reveal } from "../components/motion";
import styles from "./Faq.module.css";

const FAQS = [
  {
    question: "Do volunteers need to create an account?",
    answer:
      "No. Volunteers sign up for a shift with their name and email. They get a personal link to see or cancel their shifts, without a password.",
  },
  {
    question: "Can we use it for festivals and one-off events?",
    answer:
      "Yes. The Events plan adds QR check-in, team leads for each area and help with setup for large volunteer crews.",
  },
  {
    question: "Where is our data stored?",
    answer:
      "On servers inside the EU. We only collect what is needed to run your shifts, and you can export or delete it at any time.",
  },
  {
    question: "Can we move our current volunteers in?",
    answer: "Yes. Upload a CSV with names and emails, and we'll invite them to your shift page.",
  },
  {
    question: "When will it be available?",
    answer: `${BRAND.name} is in private beta. Join the waitlist and we'll invite organisations in small groups so we can support each one properly.`,
  },
];

export function Faq() {
  return (
    <section id="faq" className="section" aria-labelledby="faq-title">
      <div className={`container ${styles.grid}`}>
        <Reveal className={styles.intro}>
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-title" className="section-title">
            Questions, <span className="serif">answered.</span>
          </h2>
          <p className="section-lead">
            Something else? Email{" "}
            <a href={`mailto:${BRAND.contactEmail}`} className={styles.mail}>
              {BRAND.contactEmail}
            </a>
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          {FAQS.map((f) => (
            <FaqItem key={f.question} {...f} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
