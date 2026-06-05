import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function Home() {
  const sess = await auth.api.getSession({ headers: await headers() });
  redirect(sess?.user ? "/app/chat" : "/login");
}
