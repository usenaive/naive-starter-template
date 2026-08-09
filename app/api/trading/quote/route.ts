import { NextResponse } from "next/server";
import { requireNaiveUser } from "@/lib/naive";
import { errorResponse } from "@/lib/api-utils";

// Latest quote(s) for one or more symbols. assetClass 'crypto' (default) or
// 'us_equity'. e.g. /api/trading/quote?symbols=BTC/USD,ETH/USD
export async function GET(req: Request) {
  try {
    const { client } = await requireNaiveUser();
    const { searchParams } = new URL(req.url);
    const symbols = searchParams.get("symbols");
    const assetClass = searchParams.get("class");
    if (!symbols) {
      return NextResponse.json({ error: "symbols query param is required" }, { status: 400 });
    }
    const result = await client.trading.quote(
      symbols,
      assetClass === "us_equity" || assetClass === "crypto" ? { assetClass } : {},
    );
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
