import { BRAND } from "../brand";

/** Mark: three glowing dots (people) above a shift slot. */
export function Logo() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="kr-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8B7BFF" />
            <stop offset="1" stopColor="#4D7CFF" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#kr-g)" />
        <circle cx="10" cy="12" r="3" fill="#fff" />
        <circle cx="16" cy="12" r="3" fill="#fff" opacity=".8" />
        <circle cx="22" cy="12" r="3" fill="#FFB38A" />
        <rect x="7" y="19" width="18" height="5" rx="2.5" fill="#fff" opacity=".9" />
      </svg>
      <span style={{ fontWeight: 600, fontSize: "1.125rem", letterSpacing: "-0.03em" }}>{BRAND.name}</span>
    </span>
  );
}
