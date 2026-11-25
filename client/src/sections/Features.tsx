import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BarChart3, BellRing, Link2, Repeat, ShieldCheck, LayoutGrid, Mail } from "lucide-react";
import { Reveal, trackSpotlight } from "../components/motion";
import styles from "./Features.module.css";

const ease = [0.22, 1, 0.36, 1] as const;

function Tile({ className = "", delay = 0, children }: { className?: string; delay?: number; children: ReactNode }) {
  return (
    <Reveal delay={delay} className={`glass spotlight ${styles.tile} ${className}`} onMouseMove={trackSpotlight}>
      {children}
    </Reveal>
  );
}

function TileHead({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className={styles.tileHead}>
      <span className={styles.icon}>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

/** Types out a name into the mock sign-up field, on a loop. */
const NAMES = ["Kadri", "Jaan", "Liis", "Marko"];

function TypingField() {
  const [n, setN] = useState(0);
  const [chars, setChars] = useState(0);
  useEffect(() => {
    const name = NAMES[n % NAMES.length];
    const t = setTimeout(
      () => {
        if (chars < name.length) setChars((c) => c + 1);
        else {
          setChars(0);
          setN((x) => x + 1);
        }
      },
      chars < name.length ? 140 : 1600,
    );
    return () => clearTimeout(t);
  }, [chars, n]);
  return (
    <span>
      {NAMES[n % NAMES.length].slice(0, chars)}
      <span className={styles.caret} />
    </span>
  );
}

/** Reminder emails sliding into an inbox. */
function Inbox() {
  const MSGS = ["Food sorting · tomorrow 10:00", "Delivery · Sat 13:00", "Welcome desk · Sun 09:00"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => x + 1), 2400);
    return () => clearInterval(t);
  }, []);
  const shown = [0, 1].map((k) => ({ id: i - k, text: MSGS[(((i - k) % 3) + 3) % 3] }));
  return (
    <ul className={styles.inbox}>
      <AnimatePresence initial={false} mode="popLayout">
        {shown.map((m) => (
          <motion.li
            key={m.id}
            layout
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease }}
          >
            <Mail size={14} aria-hidden="true" />
            <span>Reminder: {m.text}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

export function Features() {
  return (
    <section id="features" className="section" aria-labelledby="features-title">
      <div className={styles.glow} aria-hidden="true" />
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">Features</p>
          <h2 id="features-title" className="section-title">
            Everything a coordinator needs. <span className="serif">Nothing they don't.</span>
          </h2>
          <p className="section-lead">Simple enough to set up in an afternoon. Solid enough for hundreds of volunteers.</p>
        </Reveal>

        <div className={styles.bento}>
          <Tile className={styles.wide}>
            <TileHead
              icon={<Link2 size={18} />}
              title="One link to sign up"
              text="Share a single page. Volunteers pick a shift with their name and email. No app, no password."
            />
            <div className={styles.browser} aria-hidden="true">
              <div className={styles.browserBar}>
                <i />
                <i />
                <i />
                <em>Kindhands.app/harbour-food-bank</em>
              </div>
              <div className={styles.browserBody}>
                <p className={styles.mockLabel}>Your name</p>
                <div className={styles.mockInput}>
                  <TypingField />
                </div>
                <p className={styles.mockLabel}>Shift</p>
                <div className={styles.mockInput}>Food sorting · Sat 10:00</div>
                <div className={styles.mockBtn}>Confirm shift</div>
              </div>
            </div>
          </Tile>

          <Tile delay={0.08}>
            <TileHead
              icon={<BellRing size={18} />}
              title="Automatic reminders"
              text="Emails go out before every shift, with a one-click way to cancel."
            />
            <Inbox />
          </Tile>

          <Tile>
            <TileHead
              icon={<LayoutGrid size={18} />}
              title="Live shift board"
              text="Spots update in real time. Two people can never take the last one."
            />
            <div className={styles.slots} aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0.25, scale: 0.8 }}
                  whileInView={{ opacity: i < 6 ? 1 : 0.25, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.12, ease }}
                  className={i < 6 ? styles.slotOn : ""}
                />
              ))}
            </div>
          </Tile>

          <Tile delay={0.08}>
            <TileHead
              icon={<Repeat size={18} />}
              title="Recurring shifts"
              text="Set “every Tuesday, 10–14” once. The whole season is ready."
            />
            <div className={styles.cal} aria-hidden="true">
              {Array.from({ length: 21 }, (_, i) => {
                const on = i % 7 === 1;
                return (
                  <motion.span
                    key={i}
                    className={on ? styles.calOn : ""}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: on ? 0.5 + i * 0.04 : i * 0.015, ease }}
                  />
                );
              })}
            </div>
          </Tile>

          <Tile delay={0.16}>
            <TileHead
              icon={<ShieldCheck size={18} />}
              title="Roles and permissions"
              text="Admins, coordinators and volunteers each see only what they need."
            />
            <div className={styles.roles} aria-hidden="true">
              {["Admin", "Coordinator", "Volunteer"].map((r, i) => (
                <motion.span
                  key={r}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.12, ease }}
                >
                  {r}
                </motion.span>
              ))}
            </div>
          </Tile>

          <Tile className={styles.full}>
            <TileHead
              icon={<BarChart3 size={18} />}
              title="Hours for your reports"
              text="Check volunteers in on the day. Export hours per person, project or month when funders ask for them."
            />
            <div className={styles.chart} aria-hidden="true">
              {[38, 52, 46, 70, 64, 88].map((h, i) => (
                <div key={i} className={styles.barCol}>
                  <motion.span
                    className={styles.bar}
                    style={{ height: `${h}%` }}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease }}
                  />
                  <small>{["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i]}</small>
                </div>
              ))}
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}
