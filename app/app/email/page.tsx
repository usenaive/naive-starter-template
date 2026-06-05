"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Plus, Send } from "lucide-react";
import { Page, PageHeader, Empty, ErrorNote, PrimaryButton } from "@/components/ui";

interface Inbox { id: string; address: string; status: string }

export default function EmailPage() {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [localPart, setLocalPart] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // compose
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/email");
    const data = await res.json();
    if (res.ok) { setInboxes(data.inboxes ?? []); if (!from && data.inboxes?.[0]) setFrom(data.inboxes[0].id); }
    else setError(data.error);
  }, [from]);
  useEffect(() => { load(); }, [load]);

  const createInbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localPart.trim()) return;
    setBusy(true); setError(null);
    const res = await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ local_part: localPart }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error); return; }
    setLocalPart(""); setCreating(false);
    load();
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const res = await fetch("/api/email", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from_inbox: from, to, subject, body }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error); return; }
    setInfo(`Sent to ${to}.`); setTo(""); setSubject(""); setBody("");
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Primitive"
        title="Email"
        description="Real inboxes on a Naive-managed domain, isolated to this user. Your agent can send and receive."
        actions={<PrimaryButton onClick={() => setCreating((c) => !c)}><Plus className="h-3 w-3" /> New inbox</PrimaryButton>}
      />
      <ErrorNote msg={error} />
      {info && <p className="mb-3 text-[12.5px] text-[var(--emerald)]">{info}</p>}

      {creating && (
        <form onSubmit={createInbox} className="mb-5 flex items-end gap-2 rounded-lg border border-border bg-card p-3">
          <input value={localPart} onChange={(e) => setLocalPart(e.target.value)} placeholder="local part (e.g. support)" className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-[13px] outline-none" />
          <button disabled={busy} className="rounded-lg bg-foreground px-3.5 py-2 text-[12.5px] font-medium text-background hover:opacity-90 disabled:opacity-50">{busy ? "Creating…" : "Create inbox"}</button>
        </form>
      )}

      <div className="section-eyebrow mb-2">Inboxes</div>
      {inboxes.length === 0 ? (
        <Empty>No inboxes yet. Create one to get an address on your workspace domain.</Empty>
      ) : (
        <div className="mb-8 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {inboxes.map((i) => (
            <div key={i.id} className="flex items-center gap-2.5 px-4 py-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-[13px]">{i.address}</span>
            </div>
          ))}
        </div>
      )}

      {inboxes.length > 0 && (
        <>
          <div className="section-eyebrow mb-2">Compose</div>
          <form onSubmit={send} className="space-y-2 rounded-lg border border-border bg-card p-4">
            <div className="flex gap-2">
              <select value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-border bg-background px-2 py-2 text-[12.5px] outline-none">
                {inboxes.map((i) => <option key={i.id} value={i.id}>{i.address}</option>)}
              </select>
              <input value={to} onChange={(e) => setTo(e.target.value)} required placeholder="to@example.com" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none" />
            </div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="Subject" className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required placeholder="Write your message…" rows={4} className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none" />
            <button disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[12.5px] font-medium text-background hover:opacity-90 disabled:opacity-50"><Send className="h-3 w-3" /> {busy ? "Sending…" : "Send"}</button>
          </form>
        </>
      )}
    </Page>
  );
}
