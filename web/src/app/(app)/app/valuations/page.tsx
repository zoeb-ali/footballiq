"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { PageHeader } from "@/components/domain/page-header";
import { Pager } from "@/components/domain/pager";
import { AccuracyNote } from "@/components/domain/provenance";
import { SourceBadge } from "@/components/domain/source-badge";
import { ErrorState } from "@/components/domain/states";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { apiGet } from "@/lib/api/client";
import { useValuations } from "@/lib/api/queries";
import type { ValuationList } from "@/lib/api/types";
import { featureLabel } from "@/lib/features";
import { fmtEur, fmtSigned } from "@/lib/format";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

const PAGE = 50;
const SORTS = {
  value_gap: { label: "Gap between model and market", desc: "Model highest above market first", asc: "Model furthest below market first" },
  predicted_value: { label: "Model's estimate", desc: "Highest first", asc: "Lowest first" },
  market_value: { label: "Market value", desc: "Highest first", asc: "Lowest first" },
} as const;
type SortKey = keyof typeof SORTS;

function ValuationsInner() {
  const url = useUrlState();
  const sort = ((url.get("sort") ?? "value_gap") in SORTS ? (url.get("sort") ?? "value_gap") : "value_gap") as SortKey;
  const order = url.get("order") === "asc" ? "asc" : "desc";
  const offset = Number(url.get("from") ?? 0) || 0;
  const valuations = useValuations({ sort, order, limit: PAGE, offset });
  const total = valuations.data?.data.total ?? 0;
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      const rows: ValuationList["items"] = [];
      for (let o = 0; o < total; o += 100) {
        const page = await apiGet<ValuationList>(`/v1/valuations?sort=${sort}&order=${order}&limit=100&offset=${o}`);
        rows.push(...page.data.items);
      }
      const header = "player_id,name,position,market_value_eur,predicted_value_eur,value_gap_eur,top_feature,model_version";
      const csv = [
        header,
        ...rows.map((v) =>
          [
            v.player_id,
            JSON.stringify(v.name),
            v.position,
            v.market_value_eur,
            Math.round(v.predicted_value_eur),
            Math.round(v.value_gap_eur),
            v.top_k[0]?.feature_name ?? "",
            v.model_version,
          ].join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `footballiq-valuations-${sort}-${order}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Model vs market"
        description="What the valuation model thinks each player is worth next to his market value. A positive gap means the model prices him higher. Open a player to see exactly which factors moved his estimate."
        actions={
          <>
            {valuations.data ? <SourceBadge source={valuations.data.source} /> : null}
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!total || exporting}>
              <DownloadSimple size={16} aria-hidden="true" />
              {exporting ? "Preparing…" : `Download all ${total || ""} as CSV`}
            </Button>
          </>
        }
      />
      <AccuracyNote note="The model is right to within 20% for about one player in five (18% in cross-validation). Big gaps are questions worth asking, not bargains." />
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
          Sort by
          <Select value={sort} onChange={(e) => url.set({ sort: e.target.value === "value_gap" ? undefined : e.target.value, from: undefined })}>
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
          Order
          <Select value={order} onChange={(e) => url.set({ order: e.target.value === "desc" ? undefined : e.target.value, from: undefined })}>
            <option value="desc">{SORTS[sort].desc}</option>
            <option value="asc">{SORTS[sort].asc}</option>
          </Select>
        </label>
      </div>

      {valuations.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : valuations.isError ? (
        <ErrorState error={valuations.error} onRetry={() => valuations.refetch()} />
      ) : (
        <>
          <ul className="divide-y divide-rule border-y border-rule md:hidden">
            {valuations.data.data.items.map((v) => (
              <li key={v.player_id}>
                <Link href={`/app/players/${v.player_id}/explanation`} className="grid grid-cols-[1fr_auto] gap-x-3 py-3">
                  <span className="font-semibold">{v.name}</span>
                  <span className={cn("score text-right text-lg", v.value_gap_eur >= 0 ? "text-marker" : "text-cool")}>
                    {fmtSigned(v.value_gap_eur, fmtEur)}
                  </span>
                  <span className="text-[13px] text-ink-3">
                    Market {fmtEur(v.market_value_eur)}, model {fmtEur(v.predicted_value_eur)}
                  </span>
                  <span className="text-right text-[13px] text-ink-3">{v.position}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Player</TH>
                  <TH>Pos</TH>
                  <TH className="text-right">Market value</TH>
                  <TH className="text-right">Model estimate</TH>
                  <TH className="text-right">Gap</TH>
                  <TH>Biggest factor</TH>
                </tr>
              </THead>
              <TBody>
                {valuations.data.data.items.map((v) => {
                  const top = v.top_k[0];
                  return (
                    <TR key={v.player_id}>
                      <TD>
                        <Link href={`/app/players/${v.player_id}/explanation`} className="font-semibold hover:underline">
                          {v.name}
                        </Link>
                      </TD>
                      <TD className="text-ink-2">{v.position}</TD>
                      <TD className="text-right">{fmtEur(v.market_value_eur)}</TD>
                      <TD className="text-right">{fmtEur(v.predicted_value_eur)}</TD>
                      <TD className={cn("score text-right text-lg", v.value_gap_eur >= 0 ? "text-marker" : "text-cool")}>
                        {fmtSigned(v.value_gap_eur, fmtEur)}
                      </TD>
                      <TD className="text-[14px] text-ink-2">
                        {top ? (
                          <span title={top.feature_name}>
                            {featureLabel(top.feature_name)}{" "}
                            <span className="text-ink-3">
                              ({top.multiplicative_factor >= 1 ? "raised" : "lowered"} it{" "}
                              {top.multiplicative_factor >= 1
                                ? `${top.multiplicative_factor.toFixed(1)}×`
                                : `to ${Math.round(top.multiplicative_factor * 100)}%`})
                            </span>
                          </span>
                        ) : null}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
          <Pager offset={offset} page={PAGE} total={total} onChange={(o) => url.set({ from: o || undefined })} />
        </>
      )}
    </div>
  );
}

export default function ValuationsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <ValuationsInner />
    </Suspense>
  );
}
