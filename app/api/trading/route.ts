import { NextResponse } from "next/server";
import { requireNaiveUser } from "@/lib/naive";
import { errorResponse } from "@/lib/api-utils";

// Per-user trading via the SDK (naive.forUser(id).trading.*). One order endpoint
// trades stocks, options, and crypto — the symbol selects the market. Orders are
// SENSITIVE, so createOrder may return a pending_approval governed by the kit.
export async function GET() {
  try {
    const { client } = await requireNaiveUser();
    const connections = await client.trading.connections();
    return NextResponse.json(connections);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const { client } = await requireNaiveUser();
    const body = await req.json();
    const { symbol, side, notional, qty, type, time_in_force, env } = body as {
      symbol?: string;
      side?: "buy" | "sell";
      notional?: string | number;
      qty?: string | number;
      type?: "market" | "limit";
      time_in_force?: "day" | "gtc" | "ioc";
      env?: "paper" | "live";
    };

    const has = (v: unknown) => v !== undefined && v !== null && v !== "";
    if (!symbol || !side || (!has(notional) && !has(qty))) {
      return NextResponse.json(
        { error: "symbol, side, and one of notional/qty are required" },
        { status: 400 },
      );
    }

    const result = await client.trading.createOrder({
      symbol,
      side,
      ...(has(notional) ? { notional } : {}),
      ...(has(qty) ? { qty } : {}),
      type: type ?? "market",
      time_in_force: time_in_force ?? "gtc",
      ...(env ? { env } : {}),
    });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
