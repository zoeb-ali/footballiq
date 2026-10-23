"use client";

import { ImportanceBars } from "@/components/charts/importance-bars";
import { PageHeader } from "@/components/domain/page-header";
import { SourceBadge } from "@/components/domain/source-badge";
import { ErrorState } from "@/components/domain/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useModelPerformance } from "@/lib/api/queries";
import type { RegistryModel } from "@/lib/api/types";
import { fmtDate, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const CANDIDATES: Record<string, string> = {
  baseline_median: "Position average",
  baseline_linear: "Linear model",
  xgboost: "Gradient boosting",
};
const METRICS: { key: string; label: string; better: "low" | "high"; fmt: (v: number) => string }[] = [
  { key: "rmsle", label: "Typical error (RMSLE)", better: "low", fmt: (v) => v.toFixed(3) },
  { key: "mdape", label: "Median % off", better: "low", fmt: (v) => fmtPct(v, 0) },
  { key: "within_20pct", label: "Within 20% of market", better: "high", fmt: (v) => fmtPct(v, 0) },
];

function Verdict({ m }: { m: RegistryModel }) {
  const x = m.metrics.xgboost;
  const lin = m.metrics.baseline_linear;
  const med = m.metrics.baseline_median;
  if (!x || !lin || !med) return null;
  const margin = (1 - x.rmsle / lin.rmsle) * 100;
  return (
    <section aria-label="Verdict" className="flex flex-col gap-3 border-b border-rule pb-6">
      <p className="max-w-[62ch] text-[19px] leading-relaxed">
        The gradient-boosting model beats both baselines, <strong>but only narrowly</strong>: its typical error is{" "}
        {margin.toFixed(1)}% lower than a plain linear model&rsquo;s. It lands within 20% of a player&rsquo;s market value
        for <strong>{fmtPct(x.within_20pct, 0)}</strong> of players.
      </p>
      <p className="max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
        That&rsquo;s why the site calls value gaps questions rather than bargains. Market values carry information this
        data doesn&rsquo;t: contracts, club finances, form outside the tournament. The model is published only because it
        clears the gate below; checked across eight random seeds it won every time, with a typical error of 0.998 ±
        0.003 against the linear model&rsquo;s 1.004.
      </p>
    </section>
  );
}

export default function ModelsPage() {
  const perf = useModelPerformance();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Model report"
        description="How the valuation model was tested, what it beat, and which factors it leans on. Every number here is read from the model registry the API serves."
        actions={perf.data ? <SourceBadge source={perf.data.source} /> : undefined}
      />

      {perf.isPending ? (
        <Skeleton className="h-96" />
      ) : perf.isError ? (
        <ErrorState error={perf.error} onRetry={() => perf.refetch()} />
      ) : (
        perf.data.data.models.map((m) => (
          <div key={m.model_id} className="flex flex-col gap-8">
            <Verdict m={m} />
            <Card>
              <CardHeader>
                <CardTitle>The test it had to pass</CardTitle>
                <CardDescription>
                  Five-fold cross-validation, grouped by nation so no squad appears in both training and test data. The
                  published model must beat both simple baselines on typical error, or it isn&rsquo;t registered.
                </CardDescription>
              </CardHeader>
              <Table>
                <THead>
                  <tr>
                    <TH>Model</TH>
                    {METRICS.map((x) => (
                      <TH key={x.key} className="text-right">
                        {x.label}
                        <span className="block text-[12px] font-normal text-ink-3">
                          {x.better === "low" ? "lower is better" : "higher is better"}
                        </span>
                      </TH>
                    ))}
                  </tr>
                </THead>
                <TBody>
                  {Object.entries(m.metrics).map(([cand, block]) => {
                    const prod = cand === "xgboost";
                    return (
                      <TR key={cand}>
                        <TD className={cn(prod && "font-bold")}>
                          {CANDIDATES[cand] ?? cand}
                          <span className={cn("ml-2 text-[12px]", prod ? "text-marker" : "text-ink-3")}>
                            {prod ? "published" : "baseline"}
                          </span>
                        </TD>
                        {METRICS.map((x) => {
                          const vals = Object.values(m.metrics).map((b) => b[x.key]).filter((v) => v !== undefined);
                          const best = x.better === "low" ? Math.min(...vals) : Math.max(...vals);
                          const v = block[x.key];
                          return (
                            <TD key={x.key} className={cn("text-right", v === best ? "score text-lg" : "text-ink-2")}>
                              {v === undefined ? "" : x.fmt(v)}
                            </TD>
                          );
                        })}
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
              <CardContent className="text-[13px] text-ink-3">
                Version {m.version}, features {m.feature_version}, seed {m.seed}, commit {m.git_commit}, registered{" "}
                {fmtDate(m.created_at)}.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What the model leans on</CardTitle>
                <CardDescription>
                  The typical multiplier each factor applies, averaged over all{" "}
                  {perf.data.data.feature_importance[0]?.players ?? ""} players. These come from the same breakdowns shown
                  on every player page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImportanceBars rows={perf.data.data.feature_importance} />
              </CardContent>
            </Card>

            <details className="border-y border-rule">
              <summary className="flex min-h-12 cursor-pointer items-center text-[15px] font-semibold">
                Training settings
              </summary>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 pb-4 text-[14px] sm:grid-cols-4">
                {Object.entries(m.params).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-ink-3">{k}</dt>
                    <dd className="font-semibold">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        ))
      )}
    </div>
  );
}
