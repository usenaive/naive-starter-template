import { NextResponse } from "next/server";
import { requireNaiveUser } from "@/lib/naive";
import { errorResponse } from "@/lib/api-utils";

// Account summary + open positions for the connected brokerage. Both are
// best-effort: if no env is connected yet they throw not_configured, which we
// swallow so the page can render the "connect first" state cleanly.
export async function GET() {
  try {
    const { client } = await requireNaiveUser();
    const [account, positions] = await Promise.all([
      client.trading.account().catch(() => null),
      client.trading.positions().catch(() => null),
    ]);
    return NextResponse.json({
      account: account ?? null,
      positions: Array.isArray(positions) ? positions : [],
    });
  } catch (e) {
    return errorResponse(e);
  }
}
