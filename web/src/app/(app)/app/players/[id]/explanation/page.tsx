"use client";

import Link from "next/link";
import { use } from "react";
import { CaretLeft } from "@phosphor-icons/react";
import { ShapWaterfall } from "@/components/charts/shap-waterfall";
import { PageHeader } from "@/components/domain/page-header";
import { AccuracyNote, ProvenanceFooter } from "@/components/domain/provenance";
import { SourceBadge } from "@/components/domain/source-badge";
import { ErrorState } from "@/components/domain/states";
import { StatCard } from "@/components/domain/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useExplanation } from "@/lib/api/queries";
import { featureLabel, featureValue } from "@/lib/features";
import { fmtEur, fmtSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ExplanationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const explanation = useExplanation(Number(id));

  if (explanation.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (explanation.isError) return <ErrorState error={explanation.error} onRetry={() => explanation.refetch()} />;

  const e = explanation.data.data;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href={`/app/players/${e.player_id}`}
        className="inline-flex min-h-11 w-fit items-center gap-1 text-[15px] font-semibold text-ink-2 hover:text-ink"
      >
        <CaretLeft size={16} aria-hidden="true" /> Back to {e.name}
      </Link>
      <PageHeader
        title={`Why the model says ${fmtEur(e.predicted_value_eur)}`}
        description={`Every factor behind ${e.name}'s estimate, in order of how much it moved the number, rebuilt and checked in your browser.`}
        actions={<SourceBadge source={explanation.data.source} />}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard label="Model estimate" value={fmtEur(e.predicted_value_eur)} />
        <StatCard label="Market value" value={fmtEur(e.market_value_eur)} />
        <StatCard
          label="Gap"
          value={fmtSigned(e.value_gap_eur, fmtEur)}
          tone={e.value_gap_eur >= 0 ? "critical" : undefined}
          hint={e.value_gap_eur >= 0 ? "Model above market" : "Model below market"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>From a typical player to {e.name}</CardTitle>
          <CardDescription>SHAP attributions from the gradient-boosted model, largest first.</CardDescription>
        </CardHeader>
        <CardContent>
          <ShapWaterfall explanation={e} />
        </CardContent>
      </Card>

      <details className="group border-y border-rule">
        <summary className="flex min-h-12 cursor-pointer items-center text-[15px] font-semibold">
          The raw numbers for every factor
        </summary>
        <Table>
          <THead>
            <tr>
              <TH>Factor</TH>
              <TH className="text-right">His value</TH>
              <TH className="text-right">Log contribution</TH>
              <TH className="text-right">Multiplier</TH>
            </tr>
          </THead>
          <TBody>
            {[...e.contributions]
              .sort((a, b) => a.rank - b.rank)
              .map((c) => (
                <TR key={c.feature_name}>
                  <TD>
                    {featureLabel(c.feature_name)}
                    <span className="block text-[12px] text-ink-3">{c.feature_name}</span>
                  </TD>
                  <TD className="text-right">{featureValue(c.feature_name, c.feature_value)}</TD>
                  <TD className={cn("text-right", c.shap_log >= 0 ? "text-marker" : "text-cool")}>
                    {c.shap_log >= 0 ? "+" : ""}
                    {c.shap_log.toFixed(4)}
                  </TD>
                  <TD className="text-right">×{c.multiplicative_factor.toFixed(3)}</TD>
                </TR>
              ))}
          </TBody>
        </Table>
      </details>

      <AccuracyNote note="The model is right to within 20% for about one player in five. SHAP explains the model's reasoning, not the market's." />
      <ProvenanceFooter provenance={e} />
    </div>
  );
}
