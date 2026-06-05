"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Plus } from "lucide-react";
import { Page, PageHeader, Empty, ErrorNote, StatusPill, PrimaryButton } from "@/components/ui";

interface Card { id: string; name: string; status: string; spendingLimitCents?: number; last4?: string | null }

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("50");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/cards");
    const data = await res.json();
    if (res.ok) setCards(data.cards ?? []);
    else setError(data.error);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, spending_limit_cents: Math.round(parseFloat(limit) * 100) }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error); return; }
    // Issuing a card is governed — it may need approval before it runs.
    if (data.status === "pending_approval") {
      setInfo(null);
      setError(null);
      setName(""); setAdding(false);
      setPending(true);
      return;
    }
    if (data.checkout_url) { setInfo("Opening checkout to fund the card…"); window.open(data.checkout_url, "_blank", "noopener"); }
    setName(""); setAdding(false);
    setTimeout(load, 600);
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Primitive"
        title="Cards"
        description="Issue virtual payment cards for this user. Each card is isolated to the user and spend-limited."
        actions={<PrimaryButton onClick={() => setAdding((a) => !a)}><Plus className="h-3 w-3" /> New card</PrimaryButton>}
      />
      <ErrorNote msg={error} />
      {info && <p className="mb-3 text-[12.5px] text-[var(--emerald)]">{info}</p>}
      {pending && (
        <div className="mb-4 rounded-lg border border-[var(--amber)]/40 bg-[var(--amber)]/10 px-3 py-2 text-[12.5px]">
          <span className="font-medium text-[var(--amber)]">Approval required.</span>{" "}
          <span className="text-muted-foreground">Issuing a card is a governed action — review it in{" "}
            <Link href="/app/approvals" className="font-medium text-foreground underline decoration-dotted">Approvals</Link>.
          </span>
        </div>
      )}

      {adding && (
        <form onSubmit={create} className="mb-5 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Card name (e.g. Ads)" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none" />
          <label className="flex items-center gap-1 text-[12.5px] text-muted-foreground">$ <input value={limit} onChange={(e) => setLimit(e.target.value)} type="number" min="1" className="w-24 rounded-md border border-border bg-background px-2 py-2 text-[13px] outline-none" /> limit</label>
          <button disabled={busy} className="rounded-lg bg-foreground px-3.5 py-2 text-[12.5px] font-medium text-background hover:opacity-90 disabled:opacity-50">{busy ? "Creating…" : "Create"}</button>
        </form>
      )}

      {cards.length === 0 ? (
        <Empty>No cards yet. Create one above — you&rsquo;ll be sent to checkout to fund it.</Empty>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {cards.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px]">{c.name}</span>
                {c.last4 && <span className="font-mono text-[12px] text-muted-foreground">•••• {c.last4}</span>}
              </div>
              <div className="flex items-center gap-3">
                {typeof c.spendingLimitCents === "number" && <span className="text-[12px] text-muted-foreground">${(c.spendingLimitCents / 100).toFixed(0)} limit</span>}
                <StatusPill status={c.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
