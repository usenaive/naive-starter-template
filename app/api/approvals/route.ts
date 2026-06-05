import { NextResponse } from "next/server";
import { requireNaiveUser } from "@/lib/naive";
import { errorResponse } from "@/lib/api-utils";

// Thin pass-throughs to the user-scoped Naive approvals queue
// (naive.forUser(id).approvals.*). Sensitive agent actions (cards, domains, KYC,
// formation, connecting services) land here as `pending`; the end-user
// approves/denies them, and the API replays the frozen call on approval.

export async function GET(req: Request) {
  try {
    const { client } = await requireNaiveUser();
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const result = await client.approvals.list({ status });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const { client } = await requireNaiveUser();
    const { id, decision, reason } = (await req.json()) as {
      id: string;
      decision: "approve" | "deny";
      reason?: string;
    };
    if (!id || (decision !== "approve" && decision !== "deny")) {
      return NextResponse.json({ error: "id and decision (approve|deny) required" }, { status: 400 });
    }
    const result =
      decision === "approve"
        ? await client.approvals.approve(id)
        : await client.approvals.deny(id, { reason });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
