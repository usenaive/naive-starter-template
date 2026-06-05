import { Naive } from "@usenaive-sdk/node";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/lib/auth";

/**
 * The Naive client — authenticated with your WORKSPACE api key (server-side
 * secret). One client for the whole app; we scope to a specific end-user with
 * `naive.forUser(tenantUserId)`.
 */
export const naive = new Naive({
  apiKey: process.env.NAIVE_API_KEY!,
  baseUrl: process.env.NAIVE_API_URL || "https://api.usenaive.ai",
});

export const ACCOUNT_KIT_ID = process.env.NAIVE_ACCOUNT_KIT_ID || undefined;

/**
 * Provision a Naive tenant_user for a freshly-signed-up app user. Called from
 * the BetterAuth signup hook. The app user's id is passed as external_id so the
 * two systems stay linked, and the user is placed on your Account Kit (which
 * governs what apps + primitives their agent may use).
 */
export async function provisionTenantUser(appUser: { id: string; email?: string | null; name?: string | null }): Promise<string> {
  const tenant = await naive.users.create({
    external_id: appUser.id,
    email: appUser.email ?? undefined,
    label: appUser.name ?? appUser.email ?? undefined,
    account_kit_id: ACCOUNT_KIT_ID,
  });
  return tenant.id;
}

/**
 * Resolve the current request's logged-in user to a Naive-scoped client.
 * Returns the scoped SDK client plus identifiers. Throws if unauthenticated or
 * if the user hasn't been provisioned on Naive yet.
 */
export async function requireNaiveUser() {
  const sess = await auth.api.getSession({ headers: await headers() });
  if (!sess?.user) throw new Error("unauthorized");

  let naiveUserId = (sess.user as { naiveUserId?: string | null }).naiveUserId ?? null;

  // Self-heal: if the mapping is missing (e.g. user created before provisioning
  // was wired), create it now.
  if (!naiveUserId) {
    naiveUserId = await provisionTenantUser(sess.user);
    await db.update(schema.user).set({ naiveUserId }).where(eq(schema.user.id, sess.user.id));
  }

  return { client: naive.forUser(naiveUserId), naiveUserId, appUser: sess.user };
}
