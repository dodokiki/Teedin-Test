// Utilities for generating deterministic avatar colors and initials

// Helper to lighten/darken a hex color by percent (-100 to 100)
export function shadeColor(hex: string, percent: number) {
  try {
    const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
    const c =
      normalized.length === 3
        ? normalized
            .split("")
            .map(ch => ch + ch)
            .join("")
        : normalized;

    const num = parseInt(c, 16);
    if (Number.isNaN(num)) return hex;

    const amt = Math.round(2.55 * percent);
    const r = Math.min(255, Math.max(0, (num >> 16) + amt));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
    return "#" + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
  } catch {
    return hex; // fallback to original
  }
}

// Deterministic color by id/email/name
export function pickDeterministicColor(seed: string) {
  const palette = [
    "#10b981", // emerald-500
    "#3b82f6", // blue-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#14b8a6", // teal-500
    "#f97316", // orange-500
    "#06b6d4", // cyan-500
    "#84cc16", // lime-500
    "#e11d48", // rose-600
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash << 5) - hash + seed.charCodeAt(i);
  return palette[Math.abs(hash) % palette.length];
}

// Compute initials from available info
export function computeInitials(
  fullName?: string,
  firstName?: string,
  lastName?: string,
  email?: string
) {
  const name = fullName || `${firstName || ""} ${lastName || ""}`.trim();
  if (name) {
    const parts = name.split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }
  if (email) return email[0]?.toUpperCase() || "";
  return "";
}

// Derive gradient/shadow colors from a base color
export function deriveAvatarTheme(base: string) {
  const normalized = base.startsWith("#") ? base : `#${base}`;
  const bgStart = shadeColor(normalized, 30);
  const bgEnd = shadeColor(normalized, -5);
  const shadow = `${shadeColor(normalized, -20)}40`;
  const outline = shadeColor(normalized, 10);
  return { bgStart, bgEnd, shadow, outline, base: normalized };
}
