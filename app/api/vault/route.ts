import { NextResponse } from "next/server";
import { requireNaiveUser } from "@/lib/naive";
import { errorResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const { client } = await requireNaiveUser();
    const list = await client.vault.list();
    return NextResponse.json(list);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request) {
  try {
    const { client } = await requireNaiveUser();
    const { key, value, kind } = await req.json();
    if (!key || typeof value !== "string") {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }
    const result = await client.vault.put(key, value, { kind });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  // reveal
  try {
    const { client } = await requireNaiveUser();
    const { key } = await req.json();
    const result = await client.vault.reveal(key);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const { client } = await requireNaiveUser();
    const key = new URL(req.url).searchParams.get("key");
    if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
    const result = await client.vault.delete(key);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
