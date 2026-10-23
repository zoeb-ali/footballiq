"use client";

/** Labels snapshot-served data honestly (blueprint §11): degraded, never dishonest. */
export function SourceBadge({ source }: { source: "live" | "snapshot" }) {
  if (source === "live") return null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[2px] bg-caution-wash px-2 py-1 text-xs font-semibold text-caution"
      title="The live backend is asleep; this is a real API response captured when the data was last rebuilt."
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-caution" />
      Saved copy
    </span>
  );
}
