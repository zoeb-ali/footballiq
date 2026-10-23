import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Buttons as printed on the chart: ink fills, square-ish corners, no glow.
 * primary  = ink block (the one action on a screen)
 * secondary = ruled outline
 * ghost    = text only
 * marker   = the model's action (run / predict), in marker red
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[3px] text-sm font-semibold " +
    "transition-[background-color,border-color,color,transform] duration-150 " +
    "active:translate-y-px disabled:pointer-events-none disabled:opacity-45 cursor-pointer " +
    "touch-manipulation",
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper hover:bg-[#2a2e33]",
        secondary: "border border-rule-strong bg-sheet text-ink hover:border-ink",
        ghost: "text-ink-2 hover:bg-tint hover:text-ink",
        marker: "bg-marker text-white hover:bg-[#a50d26]",
        danger: "border border-marker/40 bg-marker-wash text-marker hover:bg-marker/15",
      },
      size: {
        sm: "h-9 px-3 text-[13px]",
        md: "h-11 px-4",
        lg: "h-12 px-6 text-[15px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
