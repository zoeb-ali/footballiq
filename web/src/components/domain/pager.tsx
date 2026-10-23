"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { fmtNum } from "@/lib/format";

export function Pager({
  offset,
  page,
  total,
  onChange,
}: {
  offset: number;
  page: number;
  total: number;
  onChange: (offset: number) => void;
}) {
  if (total <= page) return null;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 border-t border-rule pt-3">
      <span className="text-[14px] text-ink-2">
        {fmtNum(offset + 1)}–{fmtNum(Math.min(offset + page, total))} of {fmtNum(total)}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - page))}>
          <CaretLeft size={16} aria-hidden="true" /> Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={offset + page >= total} onClick={() => onChange(offset + page)}>
          Next <CaretRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
