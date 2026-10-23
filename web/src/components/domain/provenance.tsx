import type { Provenance } from "@/lib/api/types";
import { fmtDate } from "@/lib/format";

/** Every prediction says which model made it, on which features, when. */
export function ProvenanceFooter({ provenance }: { provenance: Provenance }) {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
      <span>Model v{provenance.model_version}</span>
      <span>Features v{provenance.feature_version}</span>
      <span>Scored {fmtDate(provenance.scored_at)}</span>
    </p>
  );
}

export function AccuracyNote({ note }: { note: string }) {
  return (
    <p className="border-l-2 border-caution bg-caution-wash px-3 py-2 text-[13px] leading-snug text-ink">
      {note}
    </p>
  );
}
