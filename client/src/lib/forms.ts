import { useState, type FormEvent } from "react";
import type { ZodType } from "zod";
import { toFieldErrors, type FieldErrors } from "@kindhands/shared";
import { ApiRequestError } from "../api/client";

/**
 * Form state helper: validates with the shared zod schema first (instant errors),
 * then calls the API action and maps server errors back onto fields.
 */
export function useForm<T>(schema: ZodType<T>) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>, raw: unknown, action: (data: T) => Promise<void>) {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = toFieldErrors(parsed.error);
      setErrors(fieldErrors);
      setFormError("");
      focusFirst(form, fieldErrors);
      return;
    }
    setErrors({});
    setFormError("");
    setBusy(true);
    try {
      await action(parsed.data);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.fields);
        setFormError(Object.keys(err.fields).length ? "" : err.message);
        focusFirst(form, err.fields);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return { errors, formError, busy, submit, setFormError };
}

function focusFirst(form: HTMLFormElement, errors: FieldErrors) {
  const first = Object.keys(errors)[0];
  if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus?.();
}

/** FormData → plain object of strings. */
export function formValues(form: HTMLFormElement) {
  return Object.fromEntries(Array.from(new FormData(form).entries()).map(([k, v]) => [k, String(v)]));
}
