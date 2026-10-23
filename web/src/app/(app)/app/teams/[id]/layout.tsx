import type { Metadata } from "next";
import { upstreamFetch } from "@/lib/api/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return { title: "Team" };
  try {
    const r = await upstreamFetch(`/v1/teams/${id}`);
    if (r.status === 200) return { title: (JSON.parse(r.body) as { name: string }).name };
  } catch {
    /* generic title */
  }
  return { title: "Team" };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
