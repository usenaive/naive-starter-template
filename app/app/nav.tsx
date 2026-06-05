"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageSquare, Plug, KeyRound, CreditCard, Mail, CheckSquare, LogOut } from "lucide-react";

function NewChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
import { signOut } from "@/lib/auth-client";

const SECTIONS: { label: string; items: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; soon?: boolean }[] }[] = [
  {
    label: "Assistant",
    items: [{ href: "/app/chat", label: "Chat", icon: MessageSquare }],
  },
  {
    label: "Primitives",
    items: [
      { href: "/app/cards", label: "Cards", icon: CreditCard },
      { href: "/app/email", label: "Email", icon: Mail },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/app/connections", label: "Connections", icon: Plug },
      { href: "/app/credentials", label: "Credentials", icon: KeyRound },
      { href: "/app/approvals", label: "Approvals", icon: CheckSquare },
    ],
  },
];

export function Sidebar({ email, name }: { email: string; name?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // Poll the pending-approval count so the nav badge stays current.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/approvals?status=pending");
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setPendingApprovals((data.approvals ?? []).length);
      } catch {
        /* ignore */
      }
    };
    tick();
    const t = setInterval(tick, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [pathname]);

  return (
    <aside className="flex w-[260px] shrink-0 flex-col bg-sidebar">
      <div className="flex h-[56px] items-center gap-2 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[13px] font-semibold text-background">A</div>
        <span className="text-[15px] font-semibold">Acme AI</span>
      </div>

      <div className="px-2.5 pb-2">
        <Link
          href="/app/chat"
          onClick={() => {
            try { localStorage.removeItem("naive-chat-history"); } catch { /* ignore */ }
            window.dispatchEvent(new Event("naive:new-chat"));
          }}
          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[14px] text-foreground transition-colors hover:bg-white/[0.06]"
        >
          <NewChatIcon className="h-[18px] w-[18px]" />
          <span className="flex-1 font-medium">New chat</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-2">
        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <div className="section-eyebrow mb-1 px-2.5">{section.label}</div>
            {section.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-0.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[14px] transition-colors ${
                    active ? "bg-white/[0.1] text-foreground" : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1">{item.label}</span>
                  {item.soon && <span className="rounded-full border border-border px-1.5 py-px text-[9px] text-muted-foreground">soon</span>}
                  {item.href === "/app/approvals" && pendingApprovals > 0 && (
                    <span className="rounded-full bg-[var(--amber)]/20 px-1.5 py-px text-[9px] font-medium text-[var(--amber)]">{pendingApprovals}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-2.5">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.06]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[12px] font-medium">
            {(name ?? email)[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px]">{name ?? "Account"}</div>
            <div className="truncate text-[11px] text-muted-foreground">{email}</div>
          </div>
          <button
            title="Sign out"
            onClick={async () => { await signOut(); router.push("/login"); }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
