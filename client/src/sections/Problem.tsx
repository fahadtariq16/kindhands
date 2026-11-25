import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import { Reveal, trackSpotlight } from "../components/motion";
import styles from "./Problem.module.css";

const CHAT = [
  { from: "Coordinator", text: "Who's coming Saturday?? Still need 3 for sorting", me: true },
  { from: "Jaan", text: "Maybe! Is it morning or afternoon?" },
  { from: "Liis", text: "Sorry, can't make it this week" },
  { from: "Coordinator", text: "Can someone update the spreadsheet pls", me: true },
  { from: "Marko", text: "Which spreadsheet?" },
];

const PAINS = ["Shifts spread across chats, emails and sheets", "No-shows on the busiest days", "Hours counted by hand for every report"];
const FIXES = ["One live board everyone can see", "Reminders before every shift", "Hours tracked automatically"];
const ROWS = [
  { label: "Saturday · Food sorting", value: "6/6 filled", ok: true },
  { label: "Saturday · Delivery", value: "4/4 filled", ok: true },
  { label: "Reminders", value: "Sent automatically" },
  { label: "Hours this month", value: "Ready to export" },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Problem() {
  return (
    <section className="section" aria-labelledby="problem-title">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">The problem</p>
          <h2 id="problem-title" className="section-title">
            Volunteers want to help. <span className="serif">The rota gets in the way.</span>
          </h2>
        </Reveal>

        <div className={styles.compare}>
          <Reveal className={`glass spotlight ${styles.card}`} onMouseMove={trackSpotlight}>
            <div className={styles.cardHead}>
              <span className={styles.tagBefore}>Before</span>
              <h3>The group chat</h3>
            </div>
            <div className={styles.chat} aria-label="Example of a messy volunteer group chat">
              {CHAT.map((m, i) => (
                <motion.div
                  key={i}
                  className={`${styles.bubble} ${m.me ? styles.me : ""}`}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.18, ease }}
                >
                  {!m.me && <span className={styles.from}>{m.from}</span>}
                  {m.text}
                </motion.div>
              ))}
            </div>
            <ul className={styles.points}>
              {PAINS.map((p) => (
                <li key={p}>
                  <span className={styles.iconBad}>
                    <X size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className={`glass spotlight ${styles.card} ${styles.after}`} delay={0.12} onMouseMove={trackSpotlight}>
            <div className={styles.cardHead}>
              <span className={styles.tagAfter}>After</span>
              <h3>One shared board</h3>
            </div>
            <div className={styles.summary}>
              {ROWS.map((r, i) => (
                <motion.div
                  key={r.label}
                  className={styles.row}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.12, ease }}
                >
                  <span>{r.label}</span>
                  <strong className={r.ok ? styles.ok : ""}>{r.value}</strong>
                </motion.div>
              ))}
            </div>
            <ul className={styles.points}>
              {FIXES.map((p) => (
                <li key={p}>
                  <span className={styles.iconGood}>
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
