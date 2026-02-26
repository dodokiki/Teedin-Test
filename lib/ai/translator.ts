import {
  makeLocalizedValue,
  type LocalizedValue,
  type SupportedLocale,
} from "@/lib/localization";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const MODEL_NAME = process.env.OPENAI_TRANSLATION_MODEL || "gpt-4o-mini";
const DEBUG_TRANSLATION = process.env.NODE_ENV !== "production";

export interface TranslateEntry {
  key: string;
  text: string;
  html?: boolean;
  context?: string;
}

export interface TranslationResult {
  success: boolean;
  data: Record<string, LocalizedValue<string>>;
  notes?: string;
}

interface SchemaResultItem {
  key: string;
  detected_language: SupportedLocale | "mixed" | "unknown";
  confidence?: number;
  thai_text: string | null;
  english_text: string | null;
}

interface SchemaResultBody {
  results: SchemaResultItem[];
  notes?: string;
}

const jsonSchema = {
  name: "bilingual_property_translation",
  schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            detected_language: {
              type: "string",
              enum: ["th", "en", "mixed", "unknown"],
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            thai_text: { type: ["string", "null"] },
            english_text: { type: ["string", "null"] },
          },
          required: [
            "key",
            "detected_language",
            "confidence",
            "thai_text",
            "english_text",
          ],
          additionalProperties: false,
        },
        minItems: 1,
      },
    },
    required: ["results"],
    additionalProperties: false,
  },
} as const;

const buildPrompt = (entries: TranslateEntry[]): string => {
  const items = entries
    .map((entry, index) => {
      const parts = [
        `Entry ${index + 1}:`,
        `key: ${entry.key}`,
        `contains_html: ${entry.html ? "yes" : "no"}`,
        entry.context ? `context: ${entry.context}` : null,
        `text: ${entry.text}`,
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n");

  return `You are a professional bilingual (Thai/English) translation specialist for real-estate listings. For every entry you receive:
- Detect the language(s) present.
- Produce natural, marketing-friendly Thai and English variants.
- thai_text must always contain fluent Thai. If the original is already Thai, polish it; if it is English or another language, translate into Thai.
- english_text must always contain fluent English. If you cannot meaningfully translate (e.g. brand names or gibberish), provide the best transliteration and never leave it empty.
- Preserve any HTML tags or bullet formatting if contains_html is yes.
- Keep measurements, numbers, proper nouns, and formatting consistent.
- If the input already includes both languages, polish each language separately without duplicating content.
- Never mix languages in the same field. Do not add explanations.
- Return output strictly matching the provided JSON schema.
- Only when the input string is completely empty or whitespace should both thai_text and english_text be null.

Translate the following entries:

${items}`;
};

const extractJsonFromResponse = async (response: Response) => {
  if (!response.ok) {
    const baseMessage = `OpenAI API request failed with status ${response.status}`;
    let detail: string | undefined;

    try {
      const rawText = await response.text();
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText);
          detail =
            parsed?.error?.message || parsed?.message || JSON.stringify(parsed);
        } catch {
          detail = rawText;
        }
      }
    } catch (innerErr) {
      if (DEBUG_TRANSLATION) {
        console.error("Failed reading OpenAI error response", innerErr);
      }
    }

    throw new Error(detail ? `${baseMessage}: ${detail}` : baseMessage);
  }

  const result = await response.json();

  const messageOutput = Array.isArray(result.output)
    ? result.output.find((item: any) => Array.isArray(item.content))
    : undefined;

  const contentItem = messageOutput
    ? messageOutput.content.find((chunk: any) => chunk.type === "output_text")
    : undefined;

  const rawText: string | undefined = contentItem?.text ?? result.output_text;

  if (!rawText) {
    throw new Error("OpenAI response did not contain output_text content");
  }

  try {
    return JSON.parse(rawText) as SchemaResultBody;
  } catch (error) {
    if (DEBUG_TRANSLATION) {
      console.error("Failed to parse translation JSON:", rawText);
    }
    throw error;
  }
};

const fallbackLocalizedValue = (
  entry: TranslateEntry
): LocalizedValue<string> =>
  makeLocalizedValue(entry.text || null, entry.text || null, {
    detectedLanguage: "unknown",
    confidence: null,
    source: { th: "unknown", en: "unknown" },
    updatedAt: new Date().toISOString(),
  });

export const translateEntries = async (
  entries: TranslateEntry[]
): Promise<TranslationResult> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const sanitizedEntries = entries
    .map(entry => ({
      ...entry,
      text: entry.text?.toString() ?? "",
    }))
    .filter(entry => entry.text.trim().length > 0);

  if (sanitizedEntries.length === 0) {
    return {
      success: true,
      data: {},
      notes: "All entries were empty",
    };
  }

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        input: [
          {
            role: "system",
            content:
              "You convert Thai real-estate listing content into bilingual Thai/English strings.",
          },
          {
            role: "user",
            content: buildPrompt(sanitizedEntries),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: jsonSchema.name,
            schema: jsonSchema.schema,
          },
        },
      }),
    });

    const schemaResult = await extractJsonFromResponse(response);

    const localizedMap: Record<string, LocalizedValue<string>> = {};

    schemaResult.results.forEach(resultItem => {
      const entry = sanitizedEntries.find(item => item.key === resultItem.key);
      if (!entry) {
        return;
      }

      const thRaw = resultItem.thai_text?.trim();
      const enRaw = resultItem.english_text?.trim();

      const th = thRaw && thRaw.length > 0 ? thRaw : entry.text || null;
      const en = enRaw && enRaw.length > 0 ? enRaw : entry.text || null;

      localizedMap[resultItem.key] = makeLocalizedValue(th, en, {
        detectedLanguage: resultItem.detected_language,
        confidence: resultItem.confidence ?? null,
        source: {
          th: thRaw ? "ai" : "user",
          en: enRaw ? "ai" : "user",
        },
        updatedAt: new Date().toISOString(),
      });
    });

    sanitizedEntries.forEach(entry => {
      if (!localizedMap[entry.key]) {
        localizedMap[entry.key] = fallbackLocalizedValue(entry);
      }
    });

    if (DEBUG_TRANSLATION) {
      console.debug("translateEntries", localizedMap);
    }

    return {
      success: true,
      data: localizedMap,
      notes: schemaResult.notes,
    };
  } catch (error) {
    console.error("translateEntries error", error);
    const fallbackData: Record<string, LocalizedValue<string>> = {};
    entries.forEach(entry => {
      fallbackData[entry.key] = fallbackLocalizedValue(entry);
    });

    return {
      success: false,
      data: fallbackData,
      notes: "Translation service failed; returning fallback values",
    };
  }
};
