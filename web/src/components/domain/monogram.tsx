import { cn } from "@/lib/utils";

/**
 * National flag (SVG from flag-icons, MIT, copied to /public/flags for the
 * 48 teams). Decorative next to a team name, so alt="" by default; pass
 * `label` when the flag stands alone.
 */
const SIZES = {
  xs: { w: 16, h: 12 },
  sm: { w: 20, h: 15 },
  md: { w: 28, h: 21 },
  lg: { w: 44, h: 33 },
  xl: { w: 64, h: 48 },
} as const;

export function Flag({
  code,
  size = "sm",
  label,
  className,
}: {
  code: string;
  size?: keyof typeof SIZES;
  label?: string;
  className?: string;
}) {
  const s = SIZES[size];
  if (!code || code === "TBD") {
    return (
      <span
        aria-hidden={label ? undefined : true}
        aria-label={label}
        style={{ width: s.w, height: s.h }}
        className={cn("inline-block shrink-0 border border-dashed border-rule-strong bg-paper", className)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs; next/image adds nothing
    <img
      src={`/flags/${code}.svg`}
      alt={label ?? ""}
      width={s.w}
      height={s.h}
      loading="lazy"
      decoding="async"
      className={cn("inline-block shrink-0 object-cover outline outline-1 -outline-offset-1 outline-black/10", className)}
    />
  );
}

/** Back-compat name used across pages: now a flag, not a coloured circle. */
export function Monogram({
  code,
  size = "md",
  className,
}: {
  code: string;
  confederation?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const map = { sm: "sm", md: "md", lg: "lg" } as const;
  return <Flag code={code} size={map[size]} className={className} />;
}
