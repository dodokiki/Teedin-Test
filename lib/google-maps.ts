/**
 * Google Maps API key used by map components.
 * Supports both NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
 */
export function getGoogleMapsApiKey(): string {
  if (typeof process === "undefined") return "";
  return (
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  );
}
