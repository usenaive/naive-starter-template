import { NextResponse } from "next/server";
import { requireNaiveUser } from "@/lib/naive";
import { errorResponse } from "@/lib/api-utils";

// Begin the brokerage OAuth flow for this user. Returns an authorize_url the
// user opens to approve access; Naive handles the callback + token storage.
export async function POST(req: Request) {
  try {
    const { client } = await requireNaiveUser();
    const { env } = (await req.json().catch(() => ({}))) as { env?: "paper" | "live" };
    const result = await client.trading.connect({ env: env ?? "paper" });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
