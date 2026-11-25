import { z } from "zod";

/**
 * Single source of truth for validation and API types.
 * Used by the React app (instant form errors) and the Express API (server-side checks).
 */

/* ------------------------------------------------------------------ */
/* Common                                                              */
/* ------------------------------------------------------------------ */

const email = z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email"));
const personName = z.string().trim().min(2, "Please enter a name").max(100, "Name is too long");
const password = z.string().min(8, "Use at least 8 characters").max(200, "Password is too long");

export type FieldErrors = Record<string, string>;

export interface ApiError {
  error: string;
  fields?: FieldErrors;
}

/** Turn a zod error into { field: firstMessage } for the UI. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Waitlist                                                            */
/* ------------------------------------------------------------------ */

export const ORG_TYPES = ["charity", "event"] as const;
export const VOLUNTEER_RANGES = ["1-25", "26-100", "101-500", "500+"] as const;

export const waitlistSchema = z.object({
  name: personName,
  email,
  organisation: z
    .string()
    .trim()
    .min(2, "Please enter your organisation")
    .max(150, "Organisation name is too long"),
  orgType: z.enum(ORG_TYPES, { error: "Choose charity or event" }),
  volunteerCount: z.enum(VOLUNTEER_RANGES, { error: "Choose a range" }),
  consent: z.literal(true, { error: "We need your consent to contact you" }),
  // Honeypot: real people never see or fill this field.
  // Validation lets it through on purpose so the server can ignore the bot quietly.
  website: z.string().max(500).optional(),
});
export type WaitlistInput = z.infer<typeof waitlistSchema>;

export interface WaitlistSuccess {
  message: string;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export const setupSchema = z.object({
  token: z.string().min(10),
  name: personName,
  organisation: z.string().trim().min(2, "Please enter your organisation").max(150),
  password,
});
export type SetupInput = z.infer<typeof setupSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(10),
  name: personName,
  password,
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export type Role = "admin" | "coordinator";

export interface Me {
  user: { id: number; name: string; email: string };
  org: { id: number; name: string; slug: string; timezone: string };
  role: Role;
}

export interface InviteInfo {
  kind: "org-setup" | "team";
  email: string;
  name: string | null;
  organisation: string;
  role: Role;
}

/* ------------------------------------------------------------------ */
/* Organisation & team                                                 */
/* ------------------------------------------------------------------ */

export const orgSettingsSchema = z.object({
  name: z.string().trim().min(2, "Please enter a name").max(150),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "At least 3 characters")
    .max(60, "At most 60 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes"),
});
export type OrgSettingsInput = z.infer<typeof orgSettingsSchema>;

export const teamInviteSchema = z.object({
  email,
  role: z.enum(["admin", "coordinator"], { error: "Choose a role" }),
});
export type TeamInviteInput = z.infer<typeof teamInviteSchema>;

export interface TeamMember {
  userId: number;
  name: string;
  email: string;
  role: Role;
}

export interface PendingInvite {
  email: string;
  role: Role;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Shifts                                                              */
/* ------------------------------------------------------------------ */

export const shiftSchema = z
  .object({
    title: z.string().trim().min(2, "Please enter a title").max(120),
    description: z.string().trim().max(1000).optional().default(""),
    location: z.string().trim().max(200).optional().default(""),
    startsAt: z.iso.datetime({ offset: true, error: "Choose a start time" }),
    endsAt: z.iso.datetime({ offset: true, error: "Choose an end time" }),
    spots: z.coerce.number().int("Whole number").min(1, "At least 1 spot").max(500, "At most 500 spots"),
    repeatWeeks: z.coerce.number().int().min(0).max(26, "At most 26 weeks").optional().default(0),
  })
  .refine((s) => new Date(s.endsAt) > new Date(s.startsAt), {
    path: ["endsAt"],
    message: "End time must be after the start time",
  })
  .refine((s) => new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime() <= 24 * 3600_000, {
    path: ["endsAt"],
    message: "A shift can be at most 24 hours",
  });
export type ShiftInput = z.input<typeof shiftSchema>;

export const shiftUpdateSchema = z
  .object({
    title: z.string().trim().min(2, "Please enter a title").max(120),
    description: z.string().trim().max(1000).default(""),
    location: z.string().trim().max(200).default(""),
    startsAt: z.iso.datetime({ offset: true, error: "Choose a start time" }),
    endsAt: z.iso.datetime({ offset: true, error: "Choose an end time" }),
    spots: z.coerce.number().int().min(1, "At least 1 spot").max(500),
  })
  .refine((s) => new Date(s.endsAt) > new Date(s.startsAt), {
    path: ["endsAt"],
    message: "End time must be after the start time",
  });
export type ShiftUpdateInput = z.input<typeof shiftUpdateSchema>;

export interface ShiftSummary {
  id: number;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  spots: number;
  filled: number;
  seriesId: string | null;
}

export interface ShiftSignup {
  id: number;
  volunteerId: number;
  name: string;
  email: string;
  status: "confirmed" | "cancelled";
  checkedIn: boolean;
  createdAt: string;
}

export interface ShiftDetail extends ShiftSummary {
  signups: ShiftSignup[];
}

/* ------------------------------------------------------------------ */
/* Volunteers & dashboard                                              */
/* ------------------------------------------------------------------ */

export const volunteerSignupSchema = z.object({
  name: personName,
  email,
  // Honeypot (public form only)
  website: z.string().max(500).optional(),
});
export type VolunteerSignupInput = z.infer<typeof volunteerSignupSchema>;

export interface VolunteerRow {
  id: number;
  name: string;
  email: string;
  shifts: number;
  hours: number;
  lastShiftAt: string | null;
  joinedAt: string;
}

export interface DashboardData {
  upcomingShifts: number;
  openSpots: number;
  volunteers: number;
  hoursThisMonth: number;
  nextShifts: ShiftSummary[];
  recentSignups: { name: string; shiftTitle: string; shiftId: number; createdAt: string }[];
}

/* ------------------------------------------------------------------ */
/* Public pages                                                        */
/* ------------------------------------------------------------------ */

export interface PublicOrg {
  name: string;
  slug: string;
  timezone: string;
  shifts: ShiftSummary[];
}

export interface ManagedSignup {
  status: "confirmed" | "cancelled";
  volunteerName: string;
  org: { name: string; slug: string; timezone: string };
  shift: { title: string; location: string; startsAt: string; endsAt: string; description: string };
  canCancel: boolean;
}
