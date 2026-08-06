import React from "react";
import { clsx } from "clsx";

interface GlassSurfaceProps {
  children: React.ReactNode;
  className?: string;
  showWindowDots?: boolean;
  title?: string;
}

export function GlassSurface({
  children,
  className,
  showWindowDots = false,
  title,
}: GlassSurfaceProps) {
  return (
    <div
      className={clsx(
        "porcelain-card rounded-2xl relative overflow-hidden bg-white border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]",
        className
      )}
    >
      {showWindowDots && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-300" />
            <div className="w-3 h-3 rounded-full bg-zinc-300" />
            <div className="w-3 h-3 rounded-full bg-zinc-300" />
          </div>
          {title && <span className="text-xs font-mono font-medium text-zinc-400">{title}</span>}
          <div className="w-12" />
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
