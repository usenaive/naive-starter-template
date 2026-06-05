import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Naive Starter — AI-native multi-tenant SaaS",
  description:
    "A starter template where every end-user gets their own AI agent that connects apps, manages credentials, and runs Naive primitives — isolated per user.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
