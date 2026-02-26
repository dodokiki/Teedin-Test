const isDebugLoggingEnabled =
  process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === "true";

export function debugLog(...args: unknown[]): void {
  if (!isDebugLoggingEnabled) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}

export function debugWarn(...args: unknown[]): void {
  if (!isDebugLoggingEnabled) return;
  // eslint-disable-next-line no-console
  console.warn(...args);
}

export function debugError(...args: unknown[]): void {
  if (!isDebugLoggingEnabled) return;
  // eslint-disable-next-line no-console
  console.error(...args);
}

