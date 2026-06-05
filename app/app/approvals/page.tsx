"use client";

import { useCallback, useEffect, useState } from "react";
import { Page, PageHeader, Empty, ErrorNote, StatusPill, PrimaryButton, GhostButton } from "@/components/ui";

interface Approval {
  id: string;
  primitive: string;
  action_type: string;
  title: string | null;
  payload: Record<string, unknown>;
  status: string;
  result: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  created_at: string;
}

const FILTERS = ["pending", "all", "executed", "denied"] as const;

export default function ApprovalsPage() {
  const [rows, setRows] = useState<Approval[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = filter === "all" ? "" : `?status=${filter}`;
    const res = await fetch(`/api/approvals${q}`);
    const data = await res.json();
    if (res.ok) { setRows(data.approvals ?? []); setError(null); }
    else { setError(data.error); setRows([]); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string, decision: "approve" | "deny") => {
    setBusy(id); setError(null);
    const res = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision }),
    });
    setBusy(null);
    if (!res.ok) { setError((await res.json()).error); return; }
    load();
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Human-in-the-loop"
        title="Approvals"
        description="Before your assistant does anything high-stakes (issue a card, buy a domain, KYC, form a company, connect a service) it asks here first. Approve to let it run."
      />
      <ErrorNote msg={error} />

      <div className="mb-4 inline-flex rounded-md border border-border bg-card p-0.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-[5px] px-2.5 py-1 text-[12.5px] capitalize transition-colors ${filter === f ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {error ? null : rows === null ? (
        <Empty>Loading…</Empty>
      ) : rows.length === 0 ? (
        <Empty>{filter === "pending" ? "Nothing waiting for your approval." : "No approvals."}</Empty>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {rows.map((a) => (
            <div key={a.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] text-foreground">{a.title ?? a.action_type}</span>
                    <StatusPill status={a.status} />
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {a.primitive} · {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
                {a.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <PrimaryButton onClick={() => resolve(a.id, "approve")} disabled={busy === a.id}>
                      {busy === a.id ? "Working…" : "Approve & run"}
                    </PrimaryButton>
                    <GhostButton onClick={() => resolve(a.id, "deny")} disabled={busy === a.id}>Deny</GhostButton>
                  </div>
                )}
              </div>
              <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 font-mono text-[11px] text-muted-foreground">
                {JSON.stringify(a.payload ?? {}, null, 2)}
              </pre>
              {a.error && (
                <pre className="mt-1.5 overflow-x-auto rounded-md border border-[var(--red)]/30 px-3 py-2 font-mono text-[11px] text-[var(--red)]">
                  {JSON.stringify(a.error, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
