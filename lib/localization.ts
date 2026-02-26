export type SupportedLocale = "th" | "en";

export type LocalizedValueSource = "user" | "ai" | "mixed" | "unknown";

export interface LocalizedMeta {
  detectedLanguage?: SupportedLocale | "mixed" | "unknown";
  confidence?: number | null;
  source?: Partial<Record<SupportedLocale, LocalizedValueSource>>;
  updatedAt?: string | null;
}

export interface LocalizedValue<T = string | string[]> {
  th: T | null;
  en: T | null;
  meta?: LocalizedMeta;
}

export const emptyLocalizedValue = <
  T = string | string[],
>(): LocalizedValue<T> => ({
  th: null,
  en: null,
  meta: {
    detectedLanguage: "unknown",
    confidence: null,
    source: {},
    updatedAt: null,
  },
});

export const normalizeLocalizedValue = <T = string | string[]>(
  value: unknown
): LocalizedValue<T> => {
  if (value && typeof value === "object") {
    const candidate = value as Partial<LocalizedValue<T>>;
    return {
      th: (candidate.th as T | null | undefined) ?? null,
      en: (candidate.en as T | null | undefined) ?? null,
      meta: {
        detectedLanguage: candidate.meta?.detectedLanguage ?? "unknown",
        confidence:
          candidate.meta?.confidence === undefined
            ? null
            : candidate.meta?.confidence,
        source: candidate.meta?.source ?? {},
        updatedAt: candidate.meta?.updatedAt ?? null,
      },
    };
  }

  if (value == null) {
    return emptyLocalizedValue<T>();
  }

  // Treat primitives/arrays as Thai source by default
  if (Array.isArray(value)) {
    return {
      th: value as unknown as T,
      en: null,
      meta: {
        detectedLanguage: "th",
        confidence: null,
        source: { th: "user" },
        updatedAt: null,
      },
    };
  }

  return {
    th: value as unknown as T,
    en: null,
    meta: {
      detectedLanguage: "th",
      confidence: null,
      source: { th: "user" },
      updatedAt: null,
    },
  };
};

export const pickLocalizedValue = <T = string | string[]>(
  value: LocalizedValue<T> | null | undefined,
  preferred: SupportedLocale,
  fallback: SupportedLocale = preferred
): T | null => {
  if (!value) {
    return null;
  }

  const primary = value[preferred];
  if (primary != null) {
    return primary;
  }

  const fallbackValue = value[fallback];
  return fallbackValue != null ? fallbackValue : null;
};

export const isLocalizedValueEmpty = (
  value: LocalizedValue | null | undefined
): boolean => {
  if (!value) {
    return true;
  }

  const { th, en } = value;
  const thEmpty =
    th == null || (typeof th === "string" && th.trim().length === 0);
  const enEmpty =
    en == null || (typeof en === "string" && en.trim().length === 0);

  return thEmpty && enEmpty;
};

export const mergeLocalizedValues = <T = string | string[]>(
  base: LocalizedValue<T>,
  incoming: Partial<LocalizedValue<T>>
): LocalizedValue<T> => {
  const merged: LocalizedValue<T> = {
    th: incoming.th ?? base.th,
    en: incoming.en ?? base.en,
    meta: {
      detectedLanguage:
        incoming.meta?.detectedLanguage ?? base.meta?.detectedLanguage,
      confidence: incoming.meta?.confidence ?? base.meta?.confidence ?? null,
      source: {
        ...(base.meta?.source ?? {}),
        ...(incoming.meta?.source ?? {}),
      },
      updatedAt: incoming.meta?.updatedAt ?? base.meta?.updatedAt ?? null,
    },
  };

  return merged;
};

export const makeLocalizedValue = <T = string | string[]>(
  th: T | null,
  en: T | null,
  meta?: LocalizedMeta
): LocalizedValue<T> => ({
  th,
  en,
  meta: {
    detectedLanguage: meta?.detectedLanguage ?? "unknown",
    confidence: meta?.confidence ?? null,
    source: meta?.source ?? {},
    updatedAt: meta?.updatedAt ?? new Date().toISOString(),
  },
});
