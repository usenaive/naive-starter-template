import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Demo app — skip email verification so you can sign in immediately.
    requireEmailVerification: false,
  },
  // Allow the extra column on `user` to be read back on the session.
  user: {
    additionalFields: {
      naiveUserId: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // After a new app user is created, provision their Naive tenant_user and
        // store the mapping. Dynamic import avoids a server/edge bundling cycle.
        after: async (newUser) => {
          try {
            const { provisionTenantUser } = await import("@/lib/naive");
            const { eq } = await import("drizzle-orm");
            const naiveUserId = await provisionTenantUser(newUser);
            await db.update(schema.user).set({ naiveUserId }).where(eq(schema.user.id, newUser.id));
          } catch (err) {
            // Don't block signup if Naive is briefly unreachable — requireNaiveUser() self-heals.
            console.error("[naive] tenant_user provisioning failed:", err);
          }
        },
      },
    },
  },
});
