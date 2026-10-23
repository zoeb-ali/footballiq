import type { FeatureImportance } from "@/lib/api/types";
import { featureLabel } from "@/lib/features";

/** Mean |SHAP| per feature, largest first, as plain horizontal bars. */
export function ImportanceBars({ rows }: { rows: FeatureImportance[] }) {
  const sorted = [...rows].sort((a, b) => b.mean_abs_shap_log - a.mean_abs_shap_log);
  const max = sorted[0]?.mean_abs_shap_log ?? 1;
  return (
    <ol className="flex flex-col gap-2.5">
      {sorted.map((r) => {
        const typical = Math.exp(r.mean_abs_shap_log);
        return (
          <li key={r.feature_name} className="grid grid-cols-[minmax(9rem,16rem)_1fr_4.5rem] items-center gap-3">
            <span className="text-[14px] leading-tight" title={r.feature_name}>
              {featureLabel(r.feature_name)}
            </span>
            <span className="h-3 bg-tint" aria-hidden="true">
              <span className="block h-full bg-ink" style={{ width: `${(r.mean_abs_shap_log / max) * 100}%` }} />
            </span>
            <span className="text-right text-[13px] text-ink-2" title={`mean |SHAP| ${r.mean_abs_shap_log.toFixed(3)} (log)`}>
              ×{typical.toFixed(2)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
