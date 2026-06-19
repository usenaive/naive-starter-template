import { NextResponse } from "next/server";
import { requireNaiveUser } from "@/lib/naive";
import { errorResponse } from "@/lib/api-utils";

/**
 * Workspace-level status — the credit balance everything is metered against.
 *
 * IMPORTANT: credits are billed at the WORKSPACE level (your single API key) and
 * are SHARED across every tenant_user. That makes the balance an OPERATOR concern,
 * not something each end-customer should see. So this is gated:
 *   - shown by default in development (handy while building), and
 *   - hidden in production unless you explicitly opt in with
 *     NAIVE_SHOW_WORKSPACE_CREDITS=true (e.g. for an internal/admin build).
 * When hidden we return `{ credits: null }` so the UI simply omits it.
 */
function workspaceCreditsVisible(): boolean {
  const flag = process.env.NAIVE_SHOW_WORKSPACE_CREDITS;
  if (flag != null) return flag === "true";
  return process.env.NODE_ENV !== "production";
}

export async function GET() {
  try {
    // Auth-gate on the app session (don't expose this unauthenticated).
    await requireNaiveUser();
    if (!workspaceCreditsVisible()) {
      return NextResponse.json({ credits: null, operator_only: true });
    }
    const base = (process.env.NAIVE_API_URL || "https://api.usenaive.ai").replace(/\/+$/, "");
    const res = await fetch(`${base}/v1/status`, {
      headers: { Authorization: `Bearer ${process.env.NAIVE_API_KEY}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.message ?? "status failed" }, { status: res.status });
    }
    return NextResponse.json({ credits: data.credits ?? null });
  } catch (e) {
    return errorResponse(e);
  }
}
