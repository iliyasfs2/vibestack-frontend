import type { InputHTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export function Input({ className, hasError = false, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[var(--radius)] border bg-transparent px-3 text-sm outline-none transition-colors placeholder:opacity-50 focus:ring-2",
        hasError
          ? "border-red-500 focus:ring-red-500/30"
          : "border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]/20",
        className,
      )}
      {...props}
    />
  );
}
