import { NextResponse } from "next/server";
import { requireNaiveUser } from "@/lib/naive";
import { errorResponse } from "@/lib/api-utils";

// Per-tenant billing — the subscription + metered usage Naive tracks for THIS
// user (driven by your own Stripe webhook via client.billing.setSubscription).
// Distinct from workspace credits (see /api/status).
export async function GET() {
  try {
    const { client } = await requireNaiveUser();
    const [subscription, usage] = await Promise.all([
      client.billing.getSubscription().catch(() => null),
      client.billing.usage().catch(() => null),
    ]);
    return NextResponse.json({ subscription, usage });
  } catch (e) {
    return errorResponse(e);
  }
}
