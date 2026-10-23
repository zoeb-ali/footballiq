"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { Flag } from "@/components/domain/monogram";
import { PageHeader } from "@/components/domain/page-header";
import { SourceBadge } from "@/components/domain/source-badge";
import { EmptyState, ErrorState } from "@/components/domain/states";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAllMatches, useTeams } from "@/lib/api/queries";
import { finishRank, finishes, type Finish } from "@/lib/tournament";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

const SORTS = { finish: "How far they got", elo: "Elo rating", name: "Name" } as const;

function TeamsInner() {
  const url = useUrlState();
  const teams = useTeams(100);
  const matches = useAllMatches();
  const confed = url.get("confed") ?? "";
  const sort = (url.get("sort") ?? "finish") as keyof typeof SORTS;
  const finish = useMemo(() => finishes(matches.data?.data ?? []), [matches.data]);
  const items = useMemo(() => teams.data?.data.items ?? [], [teams.data]);
  const confederations = [...new Set(items.map((t) => t.confederation).filter(Boolean))].sort() as string[];

  const rows = useMemo(() => {
    const list = items.filter((t) => !confed || t.confederation === confed);
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
      if (sort === "elo") return (b.elo_rating ?? 0) - (a.elo_rating ?? 0);
      const fa = finish.get(a.team_id) ?? "Group stage";
      const fb = finish.get(b.team_id) ?? "Group stage";
      return finishRank(fa) - finishRank(fb) || (b.elo_rating ?? 0) - (a.elo_rating ?? 0);
    });
  }, [items, confed, sort, finish]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teams"
        description="The 48 nations, ranked by how far they got, with the pre-tournament ratings the simulator uses."
        actions={teams.data ? <SourceBadge source={teams.data.source} /> : undefined}
      />
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
          Confederation
          <Select value={confed} onChange={(e) => url.set({ confed: e.target.value })}>
            <option value="">All six</option>
            {confederations.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
          Sort by
          <Select value={sort} onChange={(e) => url.set({ sort: e.target.value === "finish" ? undefined : e.target.value })}>
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {teams.isPending ? (
        <Skeleton className="h-96" />
      ) : teams.isError ? (
        <ErrorState error={teams.error} onRetry={() => teams.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No teams in that confederation" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Team</TH>
              <TH>Finish</TH>
              <TH className="hidden sm:table-cell">Group</TH>
              <TH className="hidden md:table-cell">Confederation</TH>
              <TH className="text-right">Elo</TH>
              <TH className="hidden text-right sm:table-cell">FIFA rank</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((t) => {
              const f: Finish = finish.get(t.team_id) ?? "Group stage";
              const podium = finishRank(f) <= 2;
              return (
                <TR key={t.team_id}>
                  <TD>
                    <Link href={`/app/teams/${t.team_id}`} className="flex items-center gap-2.5 font-semibold hover:underline">
                      <Flag code={t.fifa_code} size="md" />
                      {t.name}
                    </Link>
                  </TD>
                  <TD className={cn(podium ? "font-bold text-marker" : "text-ink-2")}>{matches.isPending ? "" : f}</TD>
                  <TD className="hidden text-ink-2 sm:table-cell">{t.group_letter ?? ""}</TD>
                  <TD className="hidden text-ink-2 md:table-cell">{t.confederation ?? ""}</TD>
                  <TD className="score text-right text-lg">{t.elo_rating ?? ""}</TD>
                  <TD className="hidden text-right text-ink-2 sm:table-cell">{t.fifa_ranking ?? ""}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <TeamsInner />
    </Suspense>
  );
}
