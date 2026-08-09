"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Link2, Search } from "lucide-react";
import { Page, PageHeader, Card, Empty, ErrorNote, StatusPill, PrimaryButton } from "@/components/ui";

interface Connection { env: string; status: string; connected: boolean; alpaca_account_id?: string | null }
interface Account { buying_power?: string; cash?: string; portfolio_value?: string; status?: string; crypto_status?: string }
interface Position { symbol: string; qty: string; market_value?: string; unrealized_pl?: string; avg_entry_price?: string; side?: string }
type Quotes = { quotes?: Record<string, { ap?: number; bp?: number; [k: string]: unknown }> };

const money = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function TradingPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [env, setEnv] = useState<"paper" | "live">("paper");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);

  // order form
  const [symbol, setSymbol] = useState("BTC/USD");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [notional, setNotional] = useState("25");

  // quote widget
  const [quoteSymbols, setQuoteSymbols] = useState("BTC/USD");
  const [quoteClass, setQuoteClass] = useState<"crypto" | "us_equity">("crypto");
  const [quotes, setQuotes] = useState<Quotes["quotes"] | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);

  const connected = connections.some((c) => c.connected || String(c.status).toLowerCase() === "active");

  const loadConnections = useCallback(async () => {
    const res = await fetch("/api/trading");
    const data = await res.json();
    if (res.ok) setConnections(data.connections ?? []);
    else setError(data.error);
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  // Once a brokerage is connected, pull the account summary + open positions.
  useEffect(() => {
    if (!connected) { setAccount(null); setPositions([]); return; }
    let alive = true;
    (async () => {
      const res = await fetch("/api/trading/positions");
      const data = await res.json();
      if (!alive || !res.ok) return;
      setAccount(data.account ?? null);
      setPositions(Array.isArray(data.positions) ? data.positions : []);
    })();
    return () => { alive = false; };
  }, [connected]);

  const connect = async () => {
    setBusy(true); setError(null); setInfo(null); setPending(false);
    const res = await fetch("/api/trading/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ env }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error); return; }
    if (data.authorize_url) {
      setInfo("Opening the brokerage authorization page…");
      window.open(data.authorize_url, "_blank", "noopener");
      setTimeout(loadConnections, 800);
    }
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null); setPending(false);
    const res = await fetch("/api/trading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, side, notional, type: "market", time_in_force: "gtc", env }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.code === "not_configured" ? "Connect a brokerage account first (above)." : data.error);
      return;
    }
    if (data.status === "pending_approval") { setPending(true); return; }
    setInfo(`Order submitted: ${side} ${notional ? `$${notional}` : ""} ${symbol}.`);
  };

  const getQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteErr(null); setQuotes(null);
    const res = await fetch(`/api/trading/quote?symbols=${encodeURIComponent(quoteSymbols)}&class=${quoteClass}`);
    const data = await res.json();
    if (!res.ok) { setQuoteErr(data.code === "not_configured" ? "Connect a brokerage first." : data.error); return; }
    setQuotes((data as Quotes).quotes ?? {});
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Primitive"
        title="Trading"
        description="Connect this user's brokerage via OAuth, then trade stocks, options, and crypto from one endpoint. Orders are governed — they may require approval."
      />
      <ErrorNote msg={error} />
      {info && <p className="mb-3 text-[12.5px] text-[var(--emerald)]">{info}</p>}
      {pending && (
        <div className="mb-4 rounded-lg border border-[var(--amber)]/40 bg-[var(--amber)]/10 px-3 py-2 text-[12.5px]">
          <span className="font-medium text-[var(--amber)]">Approval required.</span>{" "}
          <span className="text-muted-foreground">Placing an order is a governed action — review it in{" "}
            <Link href="/app/approvals" className="font-medium text-foreground underline decoration-dotted">Approvals</Link>.
          </span>
        </div>
      )}

      {/* Connect */}
      <div className="mb-5 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3">
        <label className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          Environment
          <select value={env} onChange={(e) => setEnv(e.target.value as "paper" | "live")} className="rounded-md border border-border bg-background px-2 py-2 text-[13px] outline-none">
            <option value="paper">paper</option>
            <option value="live">live</option>
          </select>
        </label>
        <PrimaryButton onClick={connect} disabled={busy}><Link2 className="h-3 w-3" /> Connect brokerage</PrimaryButton>
      </div>

      {/* Connections */}
      {connections.length === 0 ? (
        <Empty>No brokerage connected. Use “Connect brokerage” above to authorize a paper or live account.</Empty>
      ) : (
        <div className="mb-5 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {connections.map((c) => (
            <div key={c.env} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <LineChart className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px]">{c.env}</span>
                {c.alpaca_account_id && <span className="font-mono text-[12px] text-muted-foreground">{c.alpaca_account_id}</span>}
              </div>
              <StatusPill status={c.status} />
            </div>
          ))}
        </div>
      )}

      {/* Account + positions + order + quote require an ACTIVE connection.
          Until the user finishes OAuth there's nothing to trade against, so we
          gate the whole trading surface and prompt to connect. */}
      {!connected ? (
        <Empty>Connect and authorize a brokerage above to view your account, place orders, and pull quotes.</Empty>
      ) : (
        <div className="space-y-5">
          {/* Account summary */}
          {account && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Buying power", value: money(account.buying_power) },
                { label: "Cash", value: money(account.cash) },
                { label: "Portfolio value", value: money(account.portfolio_value) },
              ].map((s) => (
                <Card key={s.label} className="p-3">
                  <div className="text-[11px] text-muted-foreground">{s.label}</div>
                  <div className="mt-0.5 text-[18px] font-semibold tabular-nums">{s.value}</div>
                </Card>
              ))}
            </div>
          )}

          {/* Positions */}
          <div>
            <div className="mb-1.5 section-eyebrow">Open positions</div>
            {positions.length === 0 ? (
              <Empty>No open positions.</Empty>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {positions.map((p) => {
                  const pl = Number(p.unrealized_pl);
                  return (
                    <div key={p.symbol} className="flex items-center justify-between px-4 py-3 text-[13px]">
                      <div className="flex items-center gap-2.5">
                        <span className="font-medium">{p.symbol}</span>
                        <span className="text-[12px] text-muted-foreground">{p.qty} {p.side ?? ""}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="tabular-nums text-muted-foreground">{money(p.market_value)}</span>
                        <span className={`tabular-nums ${Number.isFinite(pl) ? (pl >= 0 ? "text-[var(--emerald)]" : "text-[var(--red)]") : ""}`}>
                          {Number.isFinite(pl) ? `${pl >= 0 ? "+" : ""}${money(p.unrealized_pl)}` : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Place an order */}
          <div>
            <div className="mb-1.5 section-eyebrow">Place an order</div>
            <form onSubmit={placeOrder} className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3">
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Symbol
                <input value={symbol} onChange={(e) => setSymbol(e.target.value)} required placeholder="BTC/USD or AAPL" className="w-36 rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Side
                <select value={side} onChange={(e) => setSide(e.target.value as "buy" | "sell")} className="rounded-md border border-border bg-background px-2 py-2 text-[13px] outline-none">
                  <option value="buy">buy</option>
                  <option value="sell">sell</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Notional ($)
                <input value={notional} onChange={(e) => setNotional(e.target.value)} type="number" min="1" required className="w-24 rounded-md border border-border bg-background px-2 py-2 text-[13px] outline-none" />
              </label>
              <button disabled={busy} className="rounded-lg bg-foreground px-3.5 py-2 text-[12.5px] font-medium text-background hover:opacity-90 disabled:opacity-50">{busy ? "Submitting…" : "Place market order"}</button>
            </form>
          </div>

          {/* Quote lookup */}
          <div>
            <div className="mb-1.5 section-eyebrow">Market data</div>
            <form onSubmit={getQuote} className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3">
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Symbols
                <input value={quoteSymbols} onChange={(e) => setQuoteSymbols(e.target.value)} required placeholder="BTC/USD,ETH/USD" className="w-48 rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Class
                <select value={quoteClass} onChange={(e) => setQuoteClass(e.target.value as "crypto" | "us_equity")} className="rounded-md border border-border bg-background px-2 py-2 text-[13px] outline-none">
                  <option value="crypto">crypto</option>
                  <option value="us_equity">us_equity</option>
                </select>
              </label>
              <button disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[12.5px] hover:bg-white/[0.05]"><Search className="h-3.5 w-3.5" /> Get quote</button>
            </form>
            {quoteErr && <p className="mt-2 text-[12.5px] text-[var(--red)]">{quoteErr}</p>}
            {quotes && (
              <div className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {Object.keys(quotes).length === 0 ? (
                  <div className="px-4 py-3 text-[12.5px] text-muted-foreground">No quotes returned.</div>
                ) : (
                  Object.entries(quotes).map(([sym, q]) => (
                    <div key={sym} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                      <span className="font-medium">{sym}</span>
                      <span className="flex gap-4 text-[12.5px] text-muted-foreground tabular-nums">
                        <span>bid {q.bp != null ? money(q.bp) : "—"}</span>
                        <span>ask {q.ap != null ? money(q.ap) : "—"}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}
