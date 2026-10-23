"use client";

/**
 * Valuation bridge: the model's estimate rebuilt from the typical player's
 * value, one factor at a time. SHAP is additive in log space, so each factor
 * multiplies the running value; the axis is logarithmic and labelled in euros.
 * The additivity invariant is recomputed in the browser and shown with its
 * tolerance, so two slightly different euro figures never sit behind an "=".
 */

import type { Explanation } from "@/lib/api/types";
import { featureLabel, featureValue } from "@/lib/features";
import { fmtEur, fmtEurFull } from "@/lib/format";
import { cn } from "@/lib/utils";

// Mirrors the backend's own gate (ml/scoring.py ADDITIVITY_TOL, log1p space).
const ADDITIVITY_TOL = 1e-4;
const MIN_SHOWN = 0.01; // factors changing the value by under 1% fold into "Other factors"

export function additivityCheck(exp: Explanation) {
  const sumLog = exp.contributions.reduce((acc, c) => acc + c.shap_log, 0);
  const reconstructedLog = exp.baseline_log + sumLog;
  const reconstructed = Math.expm1(reconstructedLog);
  const targetLog = Math.log1p(exp.predicted_value_eur);
  const gapLog = Math.abs(reconstructedLog - targetLog);
  return { reconstructed, gapLog, holds: gapLog < ADDITIVITY_TOL };
}

const TICKS = [1e5, 3e5, 1e6, 3e6, 1e7, 3e7, 1e8, 3e8];

export function ShapWaterfall({ explanation }: { explanation: Explanation }) {
  const sorted = [...explanation.contributions].sort((a, b) => Math.abs(b.shap_log) - Math.abs(a.shap_log));
  const shown = sorted.filter((c) => Math.abs(c.multiplicative_factor - 1) >= MIN_SHOWN);
  const rest = sorted.filter((c) => Math.abs(c.multiplicative_factor - 1) < MIN_SHOWN);
  const restLog = rest.reduce((n, c) => n + c.shap_log, 0);

  type Step = { label: string; detail?: string; title?: string; fromLog: number; toLog: number; kind: "start" | "step" | "end" };
  const steps: Step[] = [];
  let run = explanation.baseline_log;
  steps.push({ label: "Typical player", detail: "the model's starting point", fromLog: run, toLog: run, kind: "start" });
  for (const c of shown) {
    steps.push({
      label: featureLabel(c.feature_name),
      detail: featureValue(c.feature_name, c.feature_value),
      title: c.feature_name,
      fromLog: run,
      toLog: run + c.shap_log,
      kind: "step",
    });
    run += c.shap_log;
  }
  if (rest.length) {
    steps.push({ label: `Other ${rest.length} factors`, detail: "each under 1%", fromLog: run, toLog: run + restLog, kind: "step" });
    run += restLog;
  }
  steps.push({ label: "Model estimate", fromLog: run, toLog: run, kind: "end" });

  const values = steps.flatMap((s) => [Math.expm1(s.fromLog), Math.expm1(s.toLog)]);
  const lo = Math.max(5e4, Math.min(...values) / 1.5);
  const hi = Math.max(...values) * 1.5;
  const x = (v: number) => ((Math.log(Math.max(v, 1)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * 100;
  const ticks = TICKS.filter((t) => t >= lo && t <= hi);
  const check = additivityCheck(explanation);
  const diffEur = Math.abs(check.reconstructed - explanation.predicted_value_eur);

  return (
    <figure className="flex min-w-0 flex-col gap-4 overflow-hidden">
      <div className="grid grid-cols-[minmax(7.5rem,15rem)_1fr] gap-x-3 sm:gap-x-4">
        <div />
        <div className="relative h-6 text-[12px] text-ink-3" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${x(t)}%` }}>
              {fmtEur(t)}
            </span>
          ))}
        </div>
        {steps.map((s, i) => {
          const a = x(Math.expm1(s.fromLog));
          const b = x(Math.expm1(s.toLog));
          const up = s.toLog >= s.fromLog;
          const factor = Math.exp(s.toLog - s.fromLog);
          return (
            <div key={i} className="contents">
              <div className={cn("py-1.5 text-[14px] leading-tight", s.kind !== "step" && "font-bold")} title={s.title}>
                {s.label}
                {s.detail ? <span className="block text-[12px] font-normal text-ink-3">{s.detail}</span> : null}
              </div>
              <div className="relative h-10 border-l border-rule">
                {ticks.map((t) => (
                  <span key={t} className="absolute inset-y-0 w-px bg-rule/70" style={{ left: `${x(t)}%` }} aria-hidden="true" />
                ))}
                {s.kind === "step" ? (
                  <>
                    <span
                      className={cn("absolute top-2.5 h-5", up ? "bg-marker" : "bg-cool")}
                      style={{ left: `${Math.min(a, b)}%`, width: `${Math.max(Math.abs(b - a), 0.4)}%` }}
                    />
                    <span
                      className={cn("absolute top-2.5 whitespace-nowrap text-[13px] font-semibold", up ? "text-marker" : "text-cool")}
                      style={
                        Math.max(a, b) > 82
                          ? { right: `calc(${100 - Math.min(a, b)}% + 6px)` }
                          : { left: `calc(${Math.max(a, b)}% + 6px)` }
                      }
                    >
                      ×{factor.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="absolute top-1 h-8 w-1 -translate-x-1/2 bg-ink" style={{ left: `${a}%` }} />
                    <span
                      className="score absolute top-2 whitespace-nowrap text-lg"
                      style={a > 75 ? { right: `calc(${100 - a}% + 10px)` } : { left: `calc(${a}% + 10px)` }}
                    >
                      {fmtEur(Math.expm1(s.toLog))}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <figcaption className="flex flex-col gap-2 text-[13px] leading-relaxed text-ink-2">
        <span>
          Red bars raise the estimate, blue bars lower it. The axis is logarithmic, so equal lengths mean equal
          multiples. These are the model&rsquo;s reasons, not causes in the real market.
        </span>
        <span
          className={cn(
            "border-l-2 px-3 py-2",
            check.holds ? "border-pitch bg-pitch-wash text-ink" : "border-marker bg-marker-wash text-ink",
          )}
        >
          <strong>{check.holds ? "Checked in your browser:" : "Check failed:"}</strong> starting value × every factor ={" "}
          {fmtEurFull(check.reconstructed)}. The stored estimate is {fmtEurFull(explanation.predicted_value_eur)}
          {check.holds
            ? `, a difference of ${fmtEurFull(diffEur)}, inside the rounding the model allows (${ADDITIVITY_TOL} in log space).`
            : `; the difference of ${fmtEurFull(diffEur)} is larger than the model allows.`}
        </span>
      </figcaption>
    </figure>
  );
}
