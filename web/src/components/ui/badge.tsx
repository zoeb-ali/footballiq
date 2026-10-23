import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Small printed tags: square corners, never pills. */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-xs font-semibold leading-none",
  {
    variants: {
      variant: {
        neutral: "border border-rule text-ink-2",
        accent: "bg-pitch-wash text-pitch",
        signal: "bg-caution-wash text-caution",
        critical: "bg-marker-wash text-marker",
        info: "bg-cool-wash text-cool",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
