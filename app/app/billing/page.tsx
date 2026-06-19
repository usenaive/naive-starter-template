"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { Page, PageHeader, Card, ErrorNote } from "@/components/ui";

interface Credits { balance: number; tier: string; period_end: string | null }
interface Usage { plan: string | null; status: string | null; period: string; quotas: Record<string, number>; usage: Record<string, number> }
interface Subscription { plan?: string | null; status?: string | null }

export default function BillingPage() {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [s, b] = await Promise.all([
        fetch("/api/status").then((r) => r.json()).catch(() => null),
        fetch("/api/billing").then((r) => r.json()).catch(() => null),
      ]);
      if (s?.credits) setCredits(s.credits);
      else if (s?.error) setError(s.error);
      if (b?.usage) setUsage(b.usage);
      if (b?.subscription) setSubscription(b.subscription);
    })();
  }, []);

  const quotaKeys = usage ? Object.keys(usage.quotas ?? {}) : [];

  return (
    <Page>
      <PageHeader
        eyebrow="Account"
        title="Billing"
        description="Workspace credits (what every primitive is metered against) and this user's per-tenant subscription + usage."
      />
      <ErrorNote msg={error} />

      {/* Workspace credits — OPERATOR view (shared pool). Hidden unless the
          deployment opts in via NAIVE_SHOW_WORKSPACE_CREDITS (on by default in
          dev), so it isn't exposed to end-customers in production. */}
      {credits ? (
        <Card className="mb-5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] text-muted-foreground">Workspace credits <span className="ml-1 rounded-full border border-border px-1.5 py-px text-[9px] uppercase tracking-wide">operator</span></span>
            </div>
            <div className="text-right">
              <div className="text-[22px] font-semibold tabular-nums">{credits.balance.toFixed(2)}</div>
              <div className="text-[11px] text-muted-foreground">{credits.tier ? `${credits.tier} tier` : ""}</div>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Billed at the workspace level (your one API key) and shared across all users — so this is an operator view, not per-customer.
            Top up with <code className="rounded bg-white/[0.06] px-1">naive billing topup</code> or in the Naive dashboard.
          </p>
        </Card>
      ) : (
        <Card className="mb-5 p-4">
          <p className="text-[12px] text-muted-foreground">
            Workspace credits are an operator-only view (the balance is shared across all your users). Enable it with{" "}
            <code className="rounded bg-white/[0.06] px-1">NAIVE_SHOW_WORKSPACE_CREDITS=true</code> for an internal/admin build.
          </p>
        </Card>
      )}

      {/* Per-tenant subscription + usage */}
      <div className="mb-2 section-eyebrow">This user (tenant) billing</div>
      <Card className="p-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">Subscription</span>
          <span>{subscription?.plan ? `${subscription.plan} · ${subscription.status}` : "none"}</span>
        </div>
        {quotaKeys.length > 0 ? (
          <div className="mt-3 space-y-2">
            {quotaKeys.map((k) => (
              <div key={k} className="flex items-center justify-between text-[12.5px]">
                <span className="font-mono text-muted-foreground">{k}</span>
                <span className="tabular-nums">{usage!.usage?.[k] ?? 0} / {usage!.quotas[k]}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[12px] text-muted-foreground">
            No per-tenant plan set. Define plans with the operator <code className="rounded bg-white/[0.06] px-1">plans</code> API and
            subscribe a tenant from your Stripe webhook via <code className="rounded bg-white/[0.06] px-1">client.billing.setSubscription()</code>;
            usage + quotas then show here. Wire Naive outbound events with the <code className="rounded bg-white/[0.06] px-1">webhooks</code> primitive.
          </p>
        )}
      </Card>
    </Page>
  );
}
