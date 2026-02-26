import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase-admin";

const SIGNATURE_HEADER = "x-omise-signature";

const verifySignature = (
  payload: string,
  signature: string | null,
  secret: string
) => {
  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
};

type OmiseEvent<T = unknown> = {
  key: string;
  data: T;
};

type OmiseChargeEventData = {
  object: string;
  id: string;
  status: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.OMISE_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Webhook secret is not configured." },
        { status: 500 }
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get(SIGNATURE_HEADER);

    if (!verifySignature(rawBody, signature, secret)) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody) as OmiseEvent<OmiseChargeEventData>;
    const eventData = event.data;

    if (!eventData || eventData.object !== "charge") {
      return NextResponse.json({ received: true });
    }

    const supabase = createSupabaseAdmin();
    const { error } = await supabase
      .from("property_payments")
      .update({
        status: eventData.status,
        metadata: eventData.metadata,
        charge_snapshot: eventData,
        updated_at: new Date().toISOString(),
      })
      .eq("charge_id", eventData.id);

    if (error) {
      console.error("Failed to update payment from webhook:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update payment status." },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Omise webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Omise webhook processing failed." },
      { status: 500 }
    );
  }
}
