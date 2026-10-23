"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/domain/page-header";
import { StatCard } from "@/components/domain/stat-card";
import { apiGet, ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/** Probes go through the same proxy as the app and are never snapshotted. */
function useProbe(path: "/health" | "/ready") {
  return useQuery({
    queryKey: ["probe", path],
    queryFn: async () => {
      const started = performance.now();
      const result = await apiGet<Record<string, unknown>>(path);
      return { ...result, ms: Math.round(performance.now() - started) };
    },
    refetchInterval: 15_000,
    retry: false,
  });
}

const STEPS = [
  {
    title: "Your browser",
    body: "Loads the site from Vercel. The pages never see the API key.",
  },
  {
    title: "Vercel",
    body: "Serves pages and forwards data requests to the API with the key added. If the API doesn't answer within a few seconds, it serves a saved copy of the same response and labels it.",
  },
  {
    title: "Render",
    body: "Runs the FastAPI backend on a free instance that sleeps after 15 idle minutes and takes 30 to 60 seconds to wake.",
  },
  {
    title: "Neon",
    body: "Postgres with pgvector: the medallion warehouse (bronze, silver, gold), model outputs and the analyst's document index.",
  },
];

export default function StatusPage() {
  const health = useProbe("/health");
  const ready = useProbe("/ready");
  const up = health.data?.data.status === "alive";
  const isReady = ready.data?.data.status === "ready";
  const asleep = health.isError && health.error instanceof ApiError && health.error.status >= 500;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="System status"
        description="Live checks against the backend, refreshed every 15 seconds, through the same route every page uses."
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard
          label="API process"
          value={health.isPending ? "Checking" : up ? "Running" : asleep ? "Asleep" : "Down"}
          tone={health.isPending ? undefined : up ? "accent" : "signal"}
          hint={health.data ? `Answered in ${health.data.ms} ms` : asleep ? "A request has been sent to wake it" : undefined}
        />
        <StatCard
          label="Database"
          value={ready.isPending ? "Checking" : isReady ? "Ready" : "Not reachable"}
          tone={ready.isPending ? undefined : isReady ? "accent" : "signal"}
          hint="Includes a check that the warehouse has data"
        />
        <StatCard
          label="Pages are showing"
          value={health.isPending ? "Checking" : up ? "Live data" : "Saved copies"}
          tone={health.isPending ? undefined : up ? "accent" : "signal"}
          hint={up ? "Straight from the API" : "Real API responses from the last data build"}
        />
      </div>

      <section aria-labelledby="how" className="border-t-2 border-ink pt-5">
        <h2 id="how" className="text-xl font-bold">
          How a request travels
        </h2>
        <ol className="mt-4 grid gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className={cn("flex flex-col gap-1 border-t border-ink pt-2")}>
              <span className="text-[13px] font-semibold text-ink-3">Step {i + 1}</span>
              <span className="text-lg font-bold">{s.title}</span>
              <span className="text-[14px] leading-relaxed text-ink-2">{s.body}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-[70ch] text-[14px] leading-relaxed text-ink-2">
          Everything runs on free plans by choice, so the project costs nothing to keep online. The trade-off is the
          wake-up delay, which is why reading pages fall back to saved copies while the simulator and analyst, which need
          the live API, say so and wait.
        </p>
      </section>
    </div>
  );
}
