import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef(({ className, variant = "default", dot = false, ...props }, ref) => {
  const normalizedKey = (typeof variant === "string" ? variant : "default")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "text-foreground border-slate-200 bg-white",
    
    // Status tags - Charming, clean, bright pastels (no dark muddy backgrounds or black shadows)
    open: "border-sky-300/70 bg-sky-50 text-sky-800",
    in_progress: "border-amber-300/70 bg-amber-50 text-amber-800",
    blocked: "border-rose-300/70 bg-rose-50 text-rose-800",
    resolved: "border-emerald-300/70 bg-emerald-50 text-emerald-800",
    closed: "border-slate-200 bg-slate-100 text-slate-700",

    // Priority tags - Crisp, charming & legible
    low: "border-slate-200 bg-slate-50 text-slate-700",
    medium: "border-blue-200 bg-blue-50 text-blue-800",
    high: "border-orange-200 bg-orange-50 text-orange-800",
    critical: "border-red-300 bg-red-50 text-red-800 font-semibold",

    // Role tags
    admin: "border-purple-200 bg-purple-50 text-purple-800",
    lead: "border-indigo-200 bg-indigo-50 text-indigo-800",
    member: "border-slate-200 bg-slate-100 text-slate-700",
  };

  const statusDots = {
    open: "bg-sky-500",
    in_progress: "bg-amber-500",
    blocked: "bg-rose-500",
    resolved: "bg-emerald-500",
    closed: "bg-slate-400",
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-blue-500",
    low: "bg-slate-400",
  };

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors select-none tracking-tight",
        variants[normalizedKey] || variants.default,
        className
      )}
      {...props}
    >
      {dot && statusDots[normalizedKey] && (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusDots[normalizedKey])} />
      )}
      {props.children}
    </span>
  );
});
Badge.displayName = "Badge";

export { Badge };
