"use client";

import type { Simulation } from "@/lib/api/types";
import { fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

type Outcome = "home" | "draw" | "away";

/**
 * Win / draw / loss as one stacked bar: the three are parts of a single whole.
 * Each segment's 95% Wilson interval is printed under it. When the real result
 * is known, that outcome is marked in marker red, so the model can be judged.
 */
export function ProbBars({
  simulation,
  actual,
  className,
}: {
  simulation: Simulation;
  actual?: Outcome | null;
  className?: string;
}) {
  const parts: { key: Outcome; label: string; p: Simulation["p_draw"]; fill: string }[] = [
    { key: "home", label: `${simulation.home.name} win`, p: simulation.p_home_win, fill: "bg-ink" },
    { key: "draw", label: "Draw", p: simulation.p_draw, fill: "bg-rule-strong" },
    { key: "away", label: `${simulation.away.name} win`, p: simulation.p_away_win, fill: "bg-cool" },
  ];
  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <div className="flex h-9 w-full overflow-hidden rounded-[2px]" aria-hidden="true">
        {parts.map((part) => (
          <div
            key={part.key}
            className={cn("relative h-full transition-[width] duration-500 ease-out", part.fill)}
            style={{ width: `${part.p.value * 100}%` }}
          >
            {actual === part.key ? (
              <span className="absolute inset-x-0 -bottom-0 h-1.5 bg-marker" />
            ) : null}
          </div>
        ))}
      </div>
      <figcaption>
        <dl className="grid grid-cols-3 gap-3">
          {parts.map((part) => (
            <div key={part.key} className={cn(part.key === "draw" && "text-center", part.key === "away" && "text-right")}>
              <dt className={cn("text-[13px] font-medium", actual === part.key ? "text-marker" : "text-ink-2")}>
                {part.label}
                {actual === part.key ? " (happened)" : ""}
              </dt>
              <dd className="score text-2xl leading-tight">{fmtPct(part.p.value, 0)}</dd>
              <dd className="text-xs text-ink-3">
                95% range {fmtPct(part.p.ci_low, 0)}–{fmtPct(part.p.ci_high, 0)}
              </dd>
            </div>
          ))}
        </dl>
      </figcaption>
    </figure>
  );
}
