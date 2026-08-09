"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PendingApproval { id: string; action: string; title: string | null }
interface Msg { role: "user" | "assistant"; content: string; tools?: { name: string; ok: boolean }[]; pending?: PendingApproval[] }

const SUGGESTIONS = [
  "What can you do for me?",
  "Connect my GitHub",
  "Issue a $50 virtual card",
  "Connect my brokerage and buy $25 of BTC",
];

// Conversation is persisted client-side so a page refresh keeps the history.
// (Per-browser; for a real app you'd store this per-user on the server.)
const STORAGE_KEY = "naive-chat-history";

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Load any saved conversation on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw) as Msg[]);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  // Persist after hydration so we never clobber saved history with the initial [].
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore quota errors */
    }
  }, [messages, hydrated]);

  // "New chat" (from the sidebar) clears the current conversation.
  useEffect(() => {
    const reset = () => { setMessages([]); setInput(""); };
    window.addEventListener("naive:new-chat", reset);
    return () => window.removeEventListener("naive:new-chat", reset);
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    // Append an empty assistant placeholder we stream into.
    setMessages([...next, { role: "assistant", content: "", tools: [], pending: [] }]);
    setInput("");
    setBusy(true);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    // Local accumulator; we replace the last (assistant) message on each event.
    const acc: Msg = { role: "assistant", content: "", tools: [], pending: [] };
    const flush = () =>
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...acc, tools: [...(acc.tools ?? [])], pending: [...(acc.pending ?? [])] };
        return copy;
      });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        acc.content = `Error: ${data.error ?? "request failed"}`;
        flush();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: { type: string; [k: string]: unknown };
          try { ev = JSON.parse(line); } catch { continue; }
          if (ev.type === "text") {
            acc.content += String(ev.delta ?? "");
          } else if (ev.type === "tool") {
            acc.tools = [...(acc.tools ?? []), { name: String(ev.name), ok: Boolean(ev.ok) }];
          } else if (ev.type === "pending") {
            acc.pending = [...(acc.pending ?? []), { id: String(ev.id), action: String(ev.action ?? ""), title: (ev.title as string) ?? null }];
          } else if (ev.type === "error") {
            acc.content += `${acc.content ? "\n\n" : ""}Error: ${String(ev.error ?? "failed")}`;
          }
          flush();
        }
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (e) {
      acc.content += `${acc.content ? "\n\n" : ""}Error: ${e instanceof Error ? e.message : "failed"}`;
      flush();
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const composer = (autoFocus = false) => (
    <form
      onSubmit={(e) => { e.preventDefault(); send(input); }}
      className="flex items-end gap-2 rounded-[26px] border border-border bg-surface px-3 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.25)] focus-within:border-[var(--border-strong)]"
    >
      <textarea
        autoFocus={autoFocus}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
        }}
        rows={1}
        placeholder="Ask anything"
        className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
      />
      <button
        disabled={busy || !input.trim()}
        aria-label="Send"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-30"
      >
        <SendIcon className="h-4 w-4" />
      </button>
    </form>
  );

  if (!hydrated) return <div className="h-full" />;

  if (messages.length === 0) {
    return (
      <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-6">
        <h1 className="mb-7 text-[28px] font-semibold tracking-tight">What&rsquo;s on your mind today?</h1>
        <div className="w-full max-w-2xl">{composer(true)}</div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-border px-4 py-2 text-[13.5px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-6 text-[12px] text-muted-foreground">Powered by Naive&rsquo;s LLM router (OpenRouter) + tools.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-4">
      <div className="flex-1 space-y-6 overflow-y-auto py-8">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={m.role === "user" ? "max-w-[80%]" : "w-full max-w-full"}>
              {m.role === "user" ? (
                <div className="rounded-3xl bg-surface px-4 py-2.5 text-[15px] leading-relaxed">
                  <span className="whitespace-pre-wrap">{m.content}</span>
                </div>
              ) : m.content === "" ? (
                <div className="flex items-center gap-1.5 py-1 text-muted-foreground">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                  <span className="text-[14px]">Thinking…</span>
                </div>
              ) : (
                <div className="md text-[15px] leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              )}
              {m.tools && m.tools.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.tools.map((t, j) => (
                    <span key={j} className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] ${t.ok ? "border-border text-muted-foreground" : "border-[var(--red)]/40 text-[var(--red)]"}`}>
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
              {m.pending && m.pending.length > 0 && (
                <div className="mt-2.5 rounded-xl border border-[var(--amber)]/40 bg-[var(--amber)]/10 px-3 py-2.5 text-[13px]">
                  <div className="font-medium text-[var(--amber)]">Waiting for your approval</div>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {m.pending.map((p) => (
                      <li key={p.id}>{p.title ?? p.action}</li>
                    ))}
                  </ul>
                  <Link href="/app/approvals" className="mt-1.5 inline-block text-[12.5px] font-medium text-foreground underline decoration-dotted">
                    Review in Approvals →
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="pb-4 pt-2">
        {composer()}
        <p className="mt-2 text-center text-[11px] text-muted-foreground">The assistant can make mistakes. Sensitive actions need your approval.</p>
      </div>
    </div>
  );
}
