import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[3px] border border-rule-strong bg-sheet px-3 text-ink " +
          "placeholder:text-ink-3 hover:border-ink focus-visible:border-ink",
        className,
      )}
      {...props}
    />
  );
}
