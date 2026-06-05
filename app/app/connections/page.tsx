"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plug, RefreshCw } from "lucide-react";
import { Page, PageHeader, Empty, ErrorNote, StatusPill, GhostButton } from "@/components/ui";

interface Conn { id: string; toolkit: string; status: string }
interface Toolkit { slug: string; name: string }

export default function ConnectionsPage() {
  const [connected, setConnected] = useState<Conn[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Toolkit[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadConnected = useCallback(async () => {
    const res = await fetch("/api/connections");
    const data = await res.json();
    if (res.ok) setConnected(data.connections ?? []);
    else setError(data.error);
  }, []);
  useEffect(() => { loadConnected(); }, [loadConnected]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/connections?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) setResults(data.toolkits ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const connect = async (toolkit: string) => {
    setBusy(toolkit); setError(null); setPending(false);
    const res = await fetch("/api/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toolkit }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) { setError(data.error); return; }
    // Connecting a service is governed — it may need approval before it runs.
    if (data.status === "pending_approval") { setPending(true); return; }
    if (data.redirectUrl) window.open(data.redirectUrl, "_blank", "noopener");
    setTimeout(loadConnected, 800);
  };

  const disconnect = async (toolkit: string) => {
    setBusy(toolkit);
    await fetch(`/api/connections?toolkit=${encodeURIComponent(toolkit)}`, { method: "DELETE" });
    setBusy(null);
    loadConnected();
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Integrations"
        title="Connections"
        description="Connect third-party apps. Your AI assistant can use whatever you connect (within your Account Kit's policy)."
        actions={<GhostButton onClick={loadConnected}><RefreshCw className="h-3 w-3" /> Refresh</GhostButton>}
      />
      <ErrorNote msg={error} />
      {pending && (
        <div className="mb-4 rounded-lg border border-[var(--amber)]/40 bg-[var(--amber)]/10 px-3 py-2 text-[12.5px]">
          <span className="font-medium text-[var(--amber)]">Approval required.</span>{" "}
          <span className="text-muted-foreground">Connecting this service is a governed action — review it in{" "}
            <Link href="/app/approvals" className="font-medium text-foreground underline decoration-dotted">Approvals</Link>.
          </span>
        </div>
      )}

      <div className="relative mb-6 max-w-md">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search apps to connect (gmail, github, slack…)"
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-[var(--border-strong)]"
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full divide-y divide-border overflow-hidden rounded-md border border-border bg-card shadow-lg">
            {results.map((t) => (
              <div key={t.slug} className="flex items-center justify-between px-3 py-2">
                <span className="text-[13px]">{t.name} <span className="font-mono text-[11px] text-muted-foreground">{t.slug}</span></span>
                <button onClick={() => connect(t.slug)} disabled={busy === t.slug} className="rounded-full bg-foreground px-3 py-1 text-[11.5px] font-medium text-background hover:opacity-90 disabled:opacity-50">
                  {busy === t.slug ? "…" : "Connect"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section-eyebrow mb-2">Connected</div>
      {connected.length === 0 ? (
        <Empty>Nothing connected yet. Search an app above to connect one.</Empty>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {connected.map((c) => (
            <div key={c.id} className="row-hover flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Plug className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px] capitalize">{c.toolkit}</span>
                <StatusPill status={c.status} />
              </div>
              <button onClick={() => disconnect(c.toolkit)} disabled={busy === c.toolkit} className="text-[12px] text-muted-foreground hover:text-[var(--red)]">
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
