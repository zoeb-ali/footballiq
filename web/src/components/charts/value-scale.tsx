import { fmtEur } from "@/lib/format";

/**
 * Market value vs the model's estimate on one line, with a ±20% band around
 * the estimate: the range the model reaches for only about one player in
 * five. Log scale, so a €5M and a €150M player read the same way.
 */
export function ValueScale({ market, model }: { market: number; model: number }) {
  const lo = Math.min(market, model * 0.8) / 1.6;
  const hi = Math.max(market, model * 1.2) * 1.6;
  const x = (v: number) => ((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * 100;
  const band = [x(model * 0.8), x(model * 1.2)];
  const marketInBand = market >= model * 0.8 && market <= model * 1.2;
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative h-14" aria-hidden="true">
        <div className="absolute inset-x-0 top-7 h-px bg-rule-strong" />
        <div
          className="absolute top-4 h-7 bg-marker-wash outline outline-1 -outline-offset-1 outline-marker/30"
          style={{ left: `${band[0]}%`, width: `${band[1] - band[0]}%` }}
        />
        <div className="absolute top-2 h-10 w-0.5 -translate-x-1/2 bg-marker" style={{ left: `${x(model)}%` }} />
        <div className="absolute top-1 h-12 w-0.5 -translate-x-1/2 bg-ink" style={{ left: `${x(market)}%` }} />
      </div>
      <figcaption className="flex flex-wrap justify-between gap-x-6 gap-y-1 text-[14px]">
        <span>
          <span className="mr-1.5 inline-block h-3 w-0.5 bg-ink align-middle" aria-hidden="true" />
          Market value <strong>{fmtEur(market)}</strong>
        </span>
        <span>
          <span className="mr-1.5 inline-block h-3 w-0.5 bg-marker align-middle" aria-hidden="true" />
          Model estimate <strong className="text-marker">{fmtEur(model)}</strong>, shaded ±20%
        </span>
        <span className="w-full text-[13px] text-ink-3">
          {marketInBand
            ? "The market value sits inside the model's ±20% band, so the two broadly agree."
            : "The market value sits outside the model's ±20% band. Given how often the model misses by that much, read this as a question, not a verdict."}
        </span>
      </figcaption>
    </figure>
  );
}
