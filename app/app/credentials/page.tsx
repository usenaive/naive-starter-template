"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { Page, PageHeader, Empty, ErrorNote, PrimaryButton } from "@/components/ui";

interface Entry { key: string; kind: string }

export default function CredentialsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [adding, setAdding] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [kind, setKind] = useState("api_key");
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/vault");
    const data = await res.json();
    if (res.ok) setEntries(data.entries ?? []);
    else setError(data.error);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value) return;
    setBusy(true); setError(null);
    const res = await fetch("/api/vault", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value, kind }) });
    setBusy(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setKey(""); setValue(""); setAdding(false);
    load();
  };

  const reveal = async (k: string) => {
    if (revealed[k]) { setRevealed((r) => { const n = { ...r }; delete n[k]; return n; }); return; }
    const res = await fetch("/api/vault", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: k }) });
    const data = await res.json();
    if (res.ok) setRevealed((r) => ({ ...r, [k]: data.value }));
  };

  const remove = async (k: string) => {
    await fetch(`/api/vault?key=${encodeURIComponent(k)}`, { method: "DELETE" });
    load();
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Vault"
        title="Credentials"
        description="A per-user, KMS-encrypted vault. Your assistant can read these to complete tasks."
        actions={<PrimaryButton onClick={() => setAdding((a) => !a)}><Plus className="h-3 w-3" /> Add secret</PrimaryButton>}
      />
      <ErrorNote msg={error} />

      {adding && (
        <form onSubmit={add} className="mb-5 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3">
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="key (e.g. openai.key)" className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-[12.5px] outline-none" />
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="value" className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-[12.5px] outline-none" />
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-md border border-border bg-background px-2 py-2 text-[12.5px] outline-none">
            {["api_key", "password", "token", "secret", "note"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <button disabled={busy} className="rounded-lg bg-foreground px-3.5 py-2 text-[12.5px] font-medium text-background hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        </form>
      )}

      {entries.length === 0 ? (
        <Empty>No secrets stored yet.</Empty>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {entries.map((e) => (
            <div key={e.key} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-[13px]">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  {e.key}
                  <span className="rounded-full border border-border px-1.5 py-px text-[10px] text-muted-foreground">{e.kind}</span>
                </span>
                <div className="flex gap-3 text-[12px]">
                  <button onClick={() => reveal(e.key)} className="text-muted-foreground hover:text-foreground">{revealed[e.key] ? "Hide" : "Reveal"}</button>
                  <button onClick={() => remove(e.key)} className="text-muted-foreground hover:text-[var(--red)]">Delete</button>
                </div>
              </div>
              {revealed[e.key] && <code className="mt-1.5 block break-all rounded bg-muted px-2 py-1 font-mono text-[12px]">{revealed[e.key]}</code>}
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
