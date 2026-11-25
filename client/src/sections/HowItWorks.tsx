import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { CalendarPlus, Share2, Sparkles } from "lucide-react";
import { Reveal } from "../components/motion";
import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    icon: CalendarPlus,
    title: "Create your shifts",
    body: "Add roles, times, places and how many people you need. Copy last month's rota in one click.",
  },
  {
    icon: Share2,
    title: "Share one link",
    body: "Post it in your newsletter, group chat or website. Volunteers choose what suits them.",
  },
  {
    icon: Sparkles,
    title: "Let it run",
    body: "Reminders, cancellations and waitlists happen on their own. You check people in on the day.",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section id="how" className="section" aria-labelledby="how-title">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title" className="section-title">
            From blank rota to <span className="serif">full rota</span> in three steps.
          </h2>
        </Reveal>

        <div className={styles.wrap}>
          {/* Line that draws itself as you scroll */}
          <span className={styles.track} aria-hidden="true">
            <motion.span className={styles.trackFill} style={{ scaleX: progress }} />
          </span>
          <ol className={styles.steps} ref={ref}>
            {STEPS.map((s, i) => (
              <motion.li
                key={s.title}
                className={styles.step}
                initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={styles.num}>
                  <s.icon size={22} aria-hidden="true" />
                  <small>0{i + 1}</small>
                </span>
                <h3 className={styles.title}>{s.title}</h3>
                <p className={styles.body}>{s.body}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
