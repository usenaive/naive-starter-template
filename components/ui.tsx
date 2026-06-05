import type { ReactNode } from "react";

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1000px] px-8 py-8">{children}</div>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        {eyebrow && <div className="section-eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-card ${className}`}>{children}</div>;
}

export function PrimaryButton({ children, onClick, disabled, type = "button" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[12.5px] font-medium text-background hover:opacity-90 disabled:opacity-50">
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[12.5px] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground disabled:opacity-50">
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-[var(--border-strong)] ${props.className ?? ""}`} />;
}

export function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const emerald = ["ACTIVE", "EXECUTED"];
  const amber = ["INITIATED", "INITIALIZING", "PENDING_PAYMENT", "PENDING", "PENDING_DNS", "EXECUTING"];
  const red = ["FAILED", "EXPIRED", "ISSUING_FAILED", "PAYMENT_FAILED", "REVOKED"];
  const tone =
    emerald.includes(s)
      ? "border-[var(--emerald)]/30 bg-[var(--emerald)]/10 text-[var(--emerald)]"
      : amber.includes(s)
      ? "border-[var(--amber)]/30 bg-[var(--amber)]/10 text-[var(--amber)]"
      : red.includes(s)
      ? "border-[var(--red)]/30 bg-[var(--red)]/10 text-[var(--red)]"
      : "border-border bg-white/[0.04] text-muted-foreground";
  return <span className={`rounded-full border px-2 py-0.5 font-mono text-[10.5px] ${tone}`}>{status}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">{children}</div>;
}

export function ErrorNote({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <p className="mt-2 text-[12.5px] text-[var(--red)]">{msg}</p>;
}
