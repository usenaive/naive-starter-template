"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { AuthShell, Field } from "@/components/auth-ui";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // On success, BetterAuth's create hook provisions a Naive tenant_user.
    const { error } = await signUp.email({ name, email, password });
    setLoading(false);
    if (error) setError(error.message ?? "Sign up failed");
    else router.push("/app/chat");
  };

  return (
    <AuthShell title="Create your workspace" subtitle="We'll provision a Naive user for you automatically">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name" type="text" value={name} onChange={setName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password (8+ chars)" type="password" value={password} onChange={setPassword} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={loading} className="w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50">
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Have an account? <Link href="/login" className="text-foreground underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
