import styles from "./Marquee.module.css";

const ITEMS = [
  "Food banks",
  "Animal shelters",
  "Community kitchens",
  "Libraries",
  "Youth clubs",
  "Charity shops",
  "Festivals",
  "Sports clubs",
  "Clean-up days",
];

/** Scrolling band of who the product is for. The duplicate copy is hidden from screen readers. */
export function Marquee() {
  return (
    <section className={styles.wrap} aria-label="Who it's for">
      <p className={styles.label}>Made for teams that run on goodwill</p>
      <p className="visually-hidden">{ITEMS.join(", ")}.</p>
      <div className={styles.viewport} aria-hidden="true">
        <div className={styles.track}>
          {[0, 1].map((copy) => (
            <ul key={copy} className={styles.list}>
              {ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
