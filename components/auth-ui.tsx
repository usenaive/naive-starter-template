"use client";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="dotted-bg flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-[16px] font-semibold text-background">A</div>
        <span className="text-[18px] font-semibold">Acme AI</span>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        <p className="mb-6 mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-[var(--border-strong)]"
      />
    </label>
  );
}
