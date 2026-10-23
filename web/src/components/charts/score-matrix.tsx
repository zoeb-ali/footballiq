"use client";

import type { Simulation } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Scoreline grid as a real table: rows are team A's goals, columns team B's.
 * Ink density encodes share of runs; the most likely scoreline is ringed in
 * marker red. Labels switch to white on dark cells so every value is legible.
 */
export function ScoreMatrix({ simulation }: { simulation: Simulation }) {
  const cap = simulation.score_cap;
  const axis = Array.from({ length: cap + 1 }, (_, i) => (i === cap ? `${i}+` : String(i)));
  let max = 0;
  let best = { h: 0, a: 0 };
  simulation.score_matrix.forEach((row, h) =>
    row.forEach((v, a) => {
      if (v > max) {
        max = v;
        best = { h, a };
      }
    }),
  );
  const a = simulation.home.fifa_code;
  const b = simulation.away.fifa_code;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse text-center tabular-nums">
        <caption className="mb-2 text-left text-[13px] text-ink-2">
          Share of {simulation.n_runs.toLocaleString("en")} runs ending in each scoreline. Rows: {a} goals. Columns: {b}{" "}
          goals.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-12 pb-1 text-right text-[12px] font-semibold text-ink-3">
              <span className="sr-only">{a} goals by {b} goals</span>
              <span aria-hidden="true">
                {a}\{b}
              </span>
            </th>
            {axis.map((x) => (
              <th key={x} scope="col" className="pb-1 text-[13px] font-semibold text-ink-2">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {simulation.score_matrix.map((row, h) => (
            <tr key={h}>
              <th scope="row" className="pr-2 text-right text-[13px] font-semibold text-ink-2">
                {axis[h]}
              </th>
              {row.map((v, col) => {
                const t = max ? v / max : 0;
                // Two-tier ink: light cells stay at or below 44% ink (black text
                // passes), dark cells start at 66% (white text passes). The mid-grey
                // band where neither reaches 4.5:1 is never used.
                const dark = t >= 0.5;
                const alpha = dark ? 0.66 + (t - 0.5) * 0.6 : 0.04 + t * 0.8;
                const isBest = h === best.h && col === best.a;
                return (
                  <td
                    key={col}
                    title={`${a} ${axis[h]}–${axis[col]} ${b}: ${(v * 100).toFixed(1)}% of runs`}
                    className={cn(
                      "h-11 border border-paper text-[13px]",
                      dark ? "text-white" : "text-ink",
                      isBest && "outline outline-2 -outline-offset-2 outline-marker",
                    )}
                    style={{ backgroundColor: `rgba(18, 20, 23, ${alpha.toFixed(3)})` }}
                  >
                    {v >= 0.005 ? (v * 100).toFixed(1) : <span className="opacity-40">·</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[13px] text-ink-2">
        Most likely: {a} {axis[best.h]}–{axis[best.a]} {b}, in {(max * 100).toFixed(1)}% of runs.
      </p>
    </div>
  );
}
