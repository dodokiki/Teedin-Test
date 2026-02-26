export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") {
      return maybeMessage;
    }
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export const extractErrorCode = (
  error: unknown
): string | number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  if ("code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" || typeof code === "number") {
      return code;
    }
  }

  return undefined;
};
