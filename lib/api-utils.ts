import { NextResponse } from "next/server";

/** Map an SDK/auth error to a JSON response. */
export function errorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "Request failed";
  const status = msg === "unauthorized" ? 401 : 500;
  return NextResponse.json({ error: msg }, { status });
}
