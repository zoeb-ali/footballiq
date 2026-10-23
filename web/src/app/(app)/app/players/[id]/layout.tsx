import type { Metadata } from "next";
import { upstreamFetch } from "@/lib/api/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return { title: "Player" };
  try {
    const r = await upstreamFetch(`/v1/players/${id}`);
    if (r.status === 200) {
      const p = JSON.parse(r.body) as { name: string; team: { name: string } };
      return { title: `${p.name} (${p.team.name})` };
    }
  } catch {
    /* fall through to the generic title */
  }
  return { title: "Player" };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
