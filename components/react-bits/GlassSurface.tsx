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
        "glass-panel rounded-3xl shadow-xl relative overflow-hidden transition-all duration-300 bg-white/90 border border-slate-200/80",
        className
      )}
    >
      {showWindowDots && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 bg-slate-100/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          {title && <span className="text-xs font-semibold text-slate-500 tracking-wide">{title}</span>}
          <div className="w-12" />
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
