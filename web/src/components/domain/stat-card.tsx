import { cn } from "@/lib/utils";

/**
 * A figure printed in the chart's margin: big condensed number, plain label.
 * No card around it; the rule above groups figures into a row.
 */
export function StatCard({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "accent" | "signal" | "critical";
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 border-t border-ink pt-2", className)}>
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      <span
        className={cn(
          "score text-[2rem] leading-none",
          tone === "accent" && "text-pitch",
          tone === "signal" && "text-caution",
          tone === "critical" && "text-marker",
        )}
      >
        {value}
      </span>
      {hint ? <span className="text-xs leading-snug text-ink-3">{hint}</span> : null}
    </div>
  );
}
