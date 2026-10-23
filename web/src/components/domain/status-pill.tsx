import { cn } from "@/lib/utils";

export type MatchStatus = "live" | "scheduled" | "completed";

const LABEL: Record<MatchStatus, string> = { live: "Live", scheduled: "Not played", completed: "Full time" };

/** Plain printed status word; colour only where it carries meaning. */
export function StatusPill({ status, className }: { status: MatchStatus; className?: string }) {
  return (
    <span
      className={cn(
        "text-xs font-semibold",
        status === "live" ? "text-marker" : status === "completed" ? "text-ink-3" : "text-caution",
        className,
      )}
    >
      {LABEL[status]}
    </span>
  );
}
