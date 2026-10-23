import type { Metadata } from "next";

export const metadata: Metadata = { title: "Club network" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
