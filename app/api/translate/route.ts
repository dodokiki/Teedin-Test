import { translateEntries, type TranslateEntry } from "@/lib/ai/translator";
import {
  makeLocalizedValue,
  type LocalizedValue,
  type SupportedLocale,
} from "@/lib/localization";
import { NextRequest, NextResponse } from "next/server";

interface TranslateRequestBody {
  entries: TranslateEntry[];
  fallbackLocale?: SupportedLocale;
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing OPENAI_API_KEY environment variable",
      },
      { status: 500 }
    );
  }

  let body: TranslateRequestBody;

  try {
    body = (await request.json()) as TranslateRequestBody;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON payload",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }

  if (
    !body.entries ||
    !Array.isArray(body.entries) ||
    body.entries.length === 0
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Payload must include at least one entry",
      },
      { status: 400 }
    );
  }

  const sanitizedEntries = body.entries
    .map(entry => ({
      ...entry,
      text: entry.text?.toString() ?? "",
    }))
    .filter(entry => entry.text.trim().length > 0);

  if (sanitizedEntries.length === 0) {
    return NextResponse.json({
      success: true,
      data: {},
      meta: { skipped: "All entries were empty" },
    });
  }

  try {
    const result = await translateEntries(sanitizedEntries);

    return NextResponse.json(
      {
        success: result.success,
        data: result.data,
        meta: {
          notes: result.notes,
        },
      },
      { status: result.success ? 200 : 500 }
    );
  } catch (error) {
    console.error("Translation API error", error);
    const fallbackData: Record<string, LocalizedValue<string>> = {};
    sanitizedEntries.forEach(entry => {
      fallbackData[entry.key] = makeLocalizedValue(entry.text, entry.text, {
        detectedLanguage: "unknown",
        confidence: null,
        source: { th: "unknown", en: "unknown" },
        updatedAt: new Date().toISOString(),
      });
    });

    return NextResponse.json(
      {
        success: false,
        error: "Translation request failed",
        data: fallbackData,
      },
      { status: 502 }
    );
  }
}
