import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, BellRing, CalendarCheck2, Sparkles, UserRoundCheck } from "lucide-react";
import { ShiftBoardMock } from "../components/ShiftBoardMock";
import { CountUp } from "../components/CountUp";
import styles from "./Hero.module.css";

const ease = [0.22, 1, 0.36, 1] as const;
const LINE_1 = ["Fill", "every", "shift."];
const LINE_2 = ["Skip", "the"];

interface Activity {
  id: number;
  icon: "user" | "bell" | "cal";
  text: string;
}

const FEED: Omit<Activity, "id">[] = [
  { icon: "user", text: "Anna took Food sorting" },
  { icon: "bell", text: "Reminders sent to 6 volunteers" },
  { icon: "cal", text: "Tuesday shifts created for March" },
  { icon: "user", text: "Jaan swapped to Delivery" },
  { icon: "bell", text: "Kadri confirmed Sunday" },
];

const ICONS = { user: UserRoundCheck, bell: BellRing, cal: CalendarCheck2 };

function Word({ children, i }: { children: string; i: number }) {
  return (
    <motion.span
      className={styles.word}
      initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease }}
    >
      {children}
    </motion.span>
  );
}

export function Hero() {
  const frameRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: frameRef, offset: ["start end", "start 0.25"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [22, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [0.5, 1]);

  // Live activity feed: newest on top, keeps the last 3.
  const [feed, setFeed] = useState<Activity[]>(() => FEED.slice(0, 3).map((f, i) => ({ ...f, id: i })));
  const next = useRef(3);
  useEffect(() => {
    const t = setInterval(() => {
      const item = FEED[next.current % FEED.length];
      setFeed((f) => [{ ...item, id: next.current }, ...f].slice(0, 3));
      next.current += 1;
    }, 2800);
    return () => clearInterval(t);
  }, []);

  const pushActivity = (what: string) => {
    setFeed((f) => [{ icon: "user" as const, text: `You took ${what}`, id: next.current++ }, ...f].slice(0, 3));
  };

  return (
    <section id="top" className={styles.hero}>
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.grid} />
        <div className={`${styles.orb} ${styles.orbA}`} />
        <div className={`${styles.orb} ${styles.orbB}`} />
        <div className={`${styles.orb} ${styles.orbC}`} />
      </div>

      <div className={`container ${styles.inner}`}>
        <motion.a
          href="#waitlist"
          className={styles.badge}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          <span className={styles.badgeTag}>
            <Sparkles size={13} aria-hidden="true" /> Private beta
          </span>
          Now inviting charities
          <ArrowRight size={14} aria-hidden="true" />
        </motion.a>

        <h1 className={styles.title}>
          <span className={styles.line}>
            {LINE_1.map((w, i) => (
              <Word key={w} i={i}>
                {w}
              </Word>
            ))}
          </span>
          <span className={styles.line}>
            {LINE_2.map((w, i) => (
              <Word key={w} i={i + 3}>
                {w}
              </Word>
            ))}
            <motion.span
              className={`serif ${styles.word}`}
              initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1, delay: 0.6, ease }}
            >
              spreadsheet.
            </motion.span>
          </span>
        </h1>

        <motion.p
          className={styles.lead}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.75, ease }}
        >
          Kindhands gives volunteers one simple link to pick shifts, sends the reminders for you, and counts every
          hour for your reports.
        </motion.p>

        <motion.div
          className={styles.actions}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease }}
        >
          <a href="#waitlist" className="btn btn-primary">
            Join the waitlist <ArrowRight size={17} aria-hidden="true" />
          </a>
          <a href="#how" className="btn btn-glass">
            See how it works
          </a>
        </motion.div>

        <motion.ul
          className={styles.points}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.1 }}
        >
          <li>No account needed for volunteers</li>
          <li>Built in the EU</li>
          <li>Free during beta</li>
        </motion.ul>

        {/* Product preview: tilts upright as you scroll */}
        <div className={styles.stage} ref={frameRef}>
          <motion.div
            className={styles.frame}
            style={{ rotateX, scale, opacity }}
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            transition={{ duration: 1.2, delay: 0.5, ease }}
          >
            <div className={styles.beam} aria-hidden="true" />
            <div className={styles.frameBar}>
              <span className={styles.dots} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className={styles.url}>app.kindhands.example/harbour-food-bank</span>
            </div>

            <div className={styles.dash}>
              <ShiftBoardMock onTake={pushActivity} />

              <div className={styles.side}>
                <div className={styles.panel}>
                  <p className={styles.panelLabel}>Volunteer hours · this month</p>
                  <p className={styles.big}>
                    <CountUp to={312} />
                    <span>h</span>
                  </p>
                  <div className={styles.spark} aria-hidden="true">
                    {[30, 45, 38, 60, 52, 74, 68, 90].map((h, i) => (
                      <motion.span
                        key={i}
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.6 + i * 0.06, ease }}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.panel}>
                  <p className={styles.panelLabel}>Live activity</p>
                  <ul className={styles.feed} aria-live="off">
                    <AnimatePresence initial={false} mode="popLayout">
                      {feed.map((a) => {
                        const Icon = ICONS[a.icon];
                        return (
                          <motion.li
                            key={a.id}
                            layout
                            initial={{ opacity: 0, y: -14, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.45, ease }}
                          >
                            <span className={styles.feedIcon}>
                              <Icon size={14} aria-hidden="true" />
                            </span>
                            {a.text}
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
          <p className={styles.hint}>Try it: take a shift.</p>
        </div>
      </div>
    </section>
  );
}
