import { useState } from "react";
import { motion } from "motion/react";
import { Check, Clock, MapPin } from "lucide-react";
import styles from "./ShiftBoardMock.module.css";

interface Shift {
  id: string;
  title: string;
  when: string;
  where: string;
  filled: number;
  needed: number;
  color: string;
}

const INITIAL: Shift[] = [
  { id: "sort", title: "Food sorting", when: "Sat 10:00–13:00", where: "Warehouse", filled: 5, needed: 6, color: "#FFB38A" },
  { id: "drive", title: "Delivery driver", when: "Sat 13:00–16:00", where: "Old Town route", filled: 2, needed: 4, color: "#8B7BFF" },
  { id: "desk", title: "Welcome desk", when: "Sun 09:00–12:00", where: "Community hall", filled: 3, needed: 3, color: "#7DE8C3" },
];

/**
 * A small working demo of the product.
 * Clicking "Take shift" fills a spot: it shows the idea of the product without a screenshot.
 */
export function ShiftBoardMock({ onTake }: { onTake?: (title: string) => void }) {
  const [shifts, setShifts] = useState(INITIAL);
  const [taken, setTaken] = useState<string[]>([]);

  const take = (s: Shift) => {
    setShifts((list) => list.map((x) => (x.id === s.id && x.filled < x.needed ? { ...x, filled: x.filled + 1 } : x)));
    setTaken((t) => [...t, s.id]);
    onTake?.(s.title);
  };

  const open = shifts.reduce((n, s) => n + (s.needed - s.filled), 0);

  return (
    <div className={styles.board} aria-label="Example shift board" role="group">
      <div className={styles.head}>
        <div>
          <p className={styles.org}>This weekend</p>
          <p className={styles.week}>Harbour Food Bank</p>
        </div>
        <span className={styles.badge} aria-live="polite">
          <span className={styles.pulse} aria-hidden="true" />
          {open} {open === 1 ? "spot" : "spots"} open
        </span>
      </div>

      <ul className={styles.list}>
        {shifts.map((s) => {
          const full = s.filled >= s.needed;
          const mine = taken.includes(s.id);
          return (
            <li key={s.id} className={styles.shift}>
              <div className={styles.shiftTop}>
                <h3 className={styles.title}>
                  <span className={styles.dot} style={{ background: s.color, boxShadow: `0 0 12px ${s.color}` }} aria-hidden="true" />
                  {s.title}
                </h3>
                {mine ? (
                  <motion.span
                    className={styles.mine}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  >
                    <Check size={14} aria-hidden="true" /> You're in
                  </motion.span>
                ) : full ? (
                  <span className={styles.fullTag}>Full</span>
                ) : (
                  <button type="button" className={styles.take} onClick={() => take(s)}>
                    Take shift<span className="visually-hidden">: {s.title}</span>
                  </button>
                )}
              </div>
              <div className={styles.meta}>
                <span>
                  <Clock size={13} aria-hidden="true" /> {s.when}
                </span>
                <span>
                  <MapPin size={13} aria-hidden="true" /> {s.where}
                </span>
              </div>
              <div
                className={styles.slots}
                role="progressbar"
                aria-label={`${s.title} spots filled`}
                aria-valuenow={s.filled}
                aria-valuemin={0}
                aria-valuemax={s.needed}
                aria-valuetext={`${s.filled} of ${s.needed} spots filled`}
              >
                {Array.from({ length: s.needed }, (_, i) => (
                  <span key={i} className={styles.slot}>
                    <motion.span
                      className={styles.fill}
                      style={{ background: s.color }}
                      initial={false}
                      animate={{ scaleX: i < s.filled ? 1 : 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
