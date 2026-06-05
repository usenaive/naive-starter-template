import { NextResponse } from "next/server";
import { requireNaiveUser } from "@/lib/naive";
import { errorResponse } from "@/lib/api-utils";

// Per-user email via the SDK (naive.forUser(id).email.*).

export async function GET() {
  try {
    const { client } = await requireNaiveUser();
    const result = await client.email.listInboxes();
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  // create an inbox
  try {
    const { client } = await requireNaiveUser();
    const { local_part } = await req.json();
    if (!local_part) return NextResponse.json({ error: "local_part is required" }, { status: 400 });
    const result = await client.email.createInbox({ local_part });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request) {
  // send an email
  try {
    const { client } = await requireNaiveUser();
    const body = await req.json();
    const result = await client.email.send(body);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
