import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Sidebar } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sess = await auth.api.getSession({ headers: await headers() });
  if (!sess?.user) redirect("/login");

  return (
    <div className="flex h-screen bg-sidebar p-0 md:py-2 md:pr-2">
      <Sidebar email={sess.user.email} name={sess.user.name} />
      <main className="flex-1 overflow-y-auto bg-background md:rounded-2xl md:border md:border-border">{children}</main>
    </div>
  );
}
