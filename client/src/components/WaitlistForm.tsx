import { useState, type FormEvent } from "react";
import { ArrowRight, CircleCheck, Mail } from "lucide-react";
import { toFieldErrors, waitlistSchema, type FieldErrors, type WaitlistSuccess } from "@kindhands/shared";
import { api, ApiRequestError } from "../api/client";
import styles from "./WaitlistForm.module.css";

type Status = "idle" | "sending" | "success" | "error";

export function WaitlistForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const raw = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      organisation: String(data.get("organisation") ?? ""),
      orgType: data.get("orgType") || undefined,
      volunteerCount: data.get("volunteerCount") || undefined,
      consent: data.get("consent") === "on",
      website: String(data.get("website") ?? ""),
    };

    // Same schema as the server: errors show instantly, without a round trip.
    const parsed = waitlistSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = toFieldErrors(parsed.error);
      setErrors(fieldErrors);
      setFormError("");
      const first = Object.keys(fieldErrors)[0];
      if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus?.();
      return;
    }

    setErrors({});
    setFormError("");
    setStatus("sending");
    try {
      const res = await api<WaitlistSuccess>("/waitlist", { body: parsed.data });
      setSuccessMsg(res.message);
      setStatus("success");
      form.reset();
    } catch (err) {
      const e = err instanceof ApiRequestError ? err : new ApiRequestError(0, "Something went wrong. Please try again.");
      setErrors(e.fields);
      setFormError(e.message);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={styles.success} role="status">
        <CircleCheck size={40} aria-hidden="true" />
        <h3>Thank you!</h3>
        <p>{successMsg}</p>
        {import.meta.env.DEV && (
          <a className="btn btn-glass btn-sm" href="/dev/mailbox">
            <Mail size={15} aria-hidden="true" /> Open the dev mailbox
          </a>
        )}
      </div>
    );
  }

  const err = (k: keyof FieldErrors) =>
    errors[k] ? (
      <p id={`${k}-error`} className={styles.error}>
        {errors[k]}
      </p>
    ) : null;
  const a11y = (k: keyof FieldErrors) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `${k}-error` : undefined,
  });

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate aria-label="Join the waitlist">
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" autoComplete="name" {...a11y("name")} />
          {err("name")}
        </div>
        <div className={styles.field}>
          <label htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" autoComplete="email" {...a11y("email")} />
          {err("email")}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="organisation">Organisation</label>
        <input id="organisation" name="organisation" autoComplete="organization" {...a11y("organisation")} />
        {err("organisation")}
      </div>

      <div className={styles.row}>
        <fieldset className={styles.field} {...a11y("orgType")}>
          <legend>We are a…</legend>
          <div className={styles.choices}>
            <label className={styles.choice}>
              <input type="radio" name="orgType" value="charity" /> Charity
            </label>
            <label className={styles.choice}>
              <input type="radio" name="orgType" value="event" /> Festival or event
            </label>
          </div>
          {err("orgType")}
        </fieldset>
        <div className={styles.field}>
          <label htmlFor="volunteerCount">Number of volunteers</label>
          <select id="volunteerCount" name="volunteerCount" defaultValue="" {...a11y("volunteerCount")}>
            <option value="" disabled>
              Choose a range
            </option>
            <option value="1-25">1–25</option>
            <option value="26-100">26–100</option>
            <option value="101-500">101–500</option>
            <option value="500+">500+</option>
          </select>
          {err("volunteerCount")}
        </div>
      </div>

      {/* Honeypot for bots: hidden from people and screen readers */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.field}>
        <label className={styles.consent}>
          <input type="checkbox" name="consent" {...a11y("consent")} />
          <span>I agree to be contacted about the beta. You can ask us to delete your details at any time.</span>
        </label>
        {err("consent")}
      </div>

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className={`btn btn-grad ${styles.submit}`} disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Join the waitlist"}
        {status !== "sending" && <ArrowRight size={18} aria-hidden="true" />}
      </button>
    </form>
  );
}
