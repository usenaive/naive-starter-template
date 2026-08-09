import { NextResponse } from "next/server";
import { NaiveError } from "@usenaive-sdk/node";

/**
 * Map an SDK/auth error to a JSON response, preserving the Naive error's HTTP
 * status + code so the UI can react (e.g. surface `insufficient_credits` 402
 * with a link to top up instead of a generic 500).
 */
export function errorResponse(e: unknown) {
  if (e instanceof NaiveError) {
    return NextResponse.json(
      { error: e.message, code: e.code, hint: e.hint },
      { status: e.status || 500 },
    );
  }
  const msg = e instanceof Error ? e.message : "Request failed";
  const status = msg === "unauthorized" ? 401 : 500;
  return NextResponse.json({ error: msg }, { status });
}
