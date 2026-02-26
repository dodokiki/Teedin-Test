const isChunkLoadError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : "";

  return /ChunkLoadError/i.test(name) || /ChunkLoadError/i.test(message);
};

const delay = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

type RetryOptions = {
  retries?: number;
  retryDelayMs?: number;
};

export async function loadChunkWithRetry<T>(
  loader: () => Promise<T>,
  { retries = 3, retryDelayMs = 500 }: RetryOptions = {}
): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    const shouldRetry =
      typeof window !== "undefined" && retries > 0 && isChunkLoadError(error);

    if (!shouldRetry) {
      throw error;
    }

    await delay(retryDelayMs);

    try {
      return await loadChunkWithRetry(loader, {
        retries: retries - 1,
        retryDelayMs,
      });
    } catch (retryError) {
      const stillChunkError = isChunkLoadError(retryError);

      if (stillChunkError && typeof window !== "undefined") {
        window.location.reload();
      }

      throw retryError;
    }
  }
}
