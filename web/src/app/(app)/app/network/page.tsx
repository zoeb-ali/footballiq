"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { Flag } from "@/components/domain/monogram";
import { PageHeader } from "@/components/domain/page-header";
import { SourceBadge } from "@/components/domain/source-badge";
import { ErrorState } from "@/components/domain/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAllTalentFlow, useClubs, useNationConcentration, useTeams } from "@/lib/api/queries";
import { fmtEur, fmtPct } from "@/lib/format";
import { useUrlState } from "@/lib/url-state";

function ClubTable() {
  const clubs = useClubs(20);
  const edges = useAllTalentFlow();
  const teams = useTeams(100);
  const code = useMemo(() => new Map((teams.data?.data.items ?? []).map((t) => [t.team_id, t.fifa_code])), [teams.data]);
  const byClub = useMemo(() => {
    const m = new Map<string, { id: number; name: string; n: number }[]>();
    for (const e of edges.data?.data ?? []) {
      const list = m.get(e.club) ?? [];
      list.push({ id: e.nation_id, name: e.nation_name, n: e.player_count });
      m.set(e.club, list);
    }
    for (const list of m.values()) list.sort((a, b) => b.n - a.n);
    return m;
  }, [edges.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>The clubs behind the World Cup</CardTitle>
        <CardDescription>
          The 20 clubs whose players carried the most market value to the tournament, and the nations they played for.
        </CardDescription>
      </CardHeader>
      {clubs.isPending ? (
        <div className="p-4">
          <Skeleton className="h-96" />
        </div>
      ) : clubs.isError ? (
        <div className="px-4">
          <ErrorState error={clubs.error} onRetry={() => clubs.refetch()} />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH className="w-8 text-right">#</TH>
              <TH>Club</TH>
              <TH>Nations supplied</TH>
              <TH className="text-right">Players</TH>
              <TH className="hidden text-right sm:table-cell">Value</TH>
            </tr>
          </THead>
          <TBody>
            {clubs.data.data.items.map((c, i) => (
              <TR key={c.club}>
                <TD className="text-right text-ink-3">{i + 1}</TD>
                <TD className="font-semibold">{c.club}</TD>
                <TD>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {(byClub.get(c.club) ?? []).map((n) => (
                      <Link
                        key={n.id}
                        href={`/app/teams/${n.id}`}
                        title={`${n.name}: ${n.n} ${n.n === 1 ? "player" : "players"}`}
                        className="grid h-7 w-7 place-items-center rounded-[2px] hover:bg-tint"
                      >
                        <Flag code={code.get(n.id) ?? "TBD"} size="sm" label={`${n.name}, ${n.n}`} />
                      </Link>
                    ))}
                    <span className="text-[13px] text-ink-3">{c.nations_supplied}</span>
                  </span>
                </TD>
                <TD className="score text-right text-lg">{c.players_supplied}</TD>
                <TD className="hidden text-right sm:table-cell">{fmtEur(c.value_exported)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

function NationPanel() {
  const url = useUrlState();
  const teams = useTeams(100);
  const nationId = url.get("nation") ? Number(url.get("nation")) : null;
  const conc = useNationConcentration(nationId);
  const list = [...(teams.data?.data.items ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where one squad comes from</CardTitle>
        <CardDescription>
          Pick a nation to see which clubs supplied its 26 players. The concentration score runs from near 0 (every
          player at a different club) to 1 (all at one club).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <label className="flex w-fit flex-col gap-1 text-[13px] font-semibold text-ink-2">
          Nation
          <Select value={nationId ?? ""} onChange={(e) => url.set({ nation: e.target.value })}>
            <option value="">Choose a nation…</option>
            {list.map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.name}
              </option>
            ))}
          </Select>
        </label>
        {nationId === null ? null : conc.isPending ? (
          <Skeleton className="h-48" />
        ) : conc.isError ? (
          <ErrorState error={conc.error} onRetry={() => conc.refetch()} />
        ) : (
          <>
            <p className="text-[15px] text-ink-2">
              <strong className="text-ink">{conc.data.data.nation_name}</strong>: {conc.data.data.players_total} players
              from {conc.data.data.supplier_count} clubs, concentration{" "}
              <strong className="text-ink">{conc.data.data.hhi_players.toFixed(2)}</strong>.
            </p>
            <ul className="flex flex-col gap-3">
              {conc.data.data.top_suppliers.map((s) => (
                <li key={s.club} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                  <span className="truncate text-[15px]">{s.club}</span>
                  <span className="text-right text-[14px] text-ink-2">
                    {s.player_count} ({fmtPct(s.share, 0)})
                  </span>
                  <span className="col-span-2 h-2 bg-tint" aria-hidden="true">
                    <span className="block h-full bg-ink" style={{ width: `${s.share * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NetworkInner() {
  const edges = useAllTalentFlow();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Club network"
        description="Every World Cup player links a club to a nation: 957 links between 450 clubs and 48 nations. These are the clubs that mattered most, and how each squad was assembled."
        actions={edges.data ? <SourceBadge source={edges.data.source} /> : undefined}
      />
      <ClubTable />
      <NationPanel />
    </div>
  );
}

export default function NetworkPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <NetworkInner />
    </Suspense>
  );
}
