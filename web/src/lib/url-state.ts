"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Read/write page state in the query string so any view can be shared. */
export function useUrlState() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = useCallback(
    (patch: Record<string, string | number | undefined | null>) => {
      const p = new URLSearchParams(search.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === "") p.delete(k);
        else p.set(k, String(v));
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [search, router, pathname],
  );
  return { get: (k: string) => search.get(k), set };
}
