import { NextResponse } from "next/server";
import { requireNaiveUser } from "@/lib/naive";
import { errorResponse } from "@/lib/api-utils";

// All of these are thin pass-throughs to the user-scoped Naive SDK client.
// Everything is enforced server-side by the user's Account Kit.

export async function GET(req: Request) {
  try {
    const { client } = await requireNaiveUser();
    const search = new URL(req.url).searchParams.get("search") ?? undefined;
    // No search => show what's connected; with search => browse the catalog.
    if (search === null || search === undefined) {
      const connected = await client.connections.connected();
      return NextResponse.json(connected);
    }
    const catalog = await client.connections.list({ search, limit: 12 });
    return NextResponse.json(catalog);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const { client } = await requireNaiveUser();
    const { toolkit } = await req.json();
    const result = await client.connections.connect(toolkit);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const { client } = await requireNaiveUser();
    const toolkit = new URL(req.url).searchParams.get("toolkit");
    if (!toolkit) return NextResponse.json({ error: "toolkit required" }, { status: 400 });
    const result = await client.connections.disconnect(toolkit);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
