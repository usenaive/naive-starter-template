import { NextResponse } from "next/server";
import { requireNaiveUser } from "@/lib/naive";
import { errorResponse } from "@/lib/api-utils";

// Per-user virtual cards via the SDK (naive.forUser(id).cards.*).

export async function GET() {
  try {
    const { client } = await requireNaiveUser();
    const result = await client.cards.list();
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const { client } = await requireNaiveUser();
    const { name, spending_limit_cents } = await req.json();
    if (!name || !spending_limit_cents) {
      return NextResponse.json({ error: "name and spending_limit_cents are required" }, { status: 400 });
    }
    const result = await client.cards.create({ name, spending_limit_cents });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
