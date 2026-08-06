import React from "react";
import { clsx } from "clsx";

interface GlassSurfaceProps {
  children: React.ReactNode;
  className?: string;
  showWindowDots?: boolean;
  title?: string;
  padding?: string;
}

export function GlassSurface({
  children,
  className,
  showWindowDots = false,
  title,
  padding = "p-8",
}: GlassSurfaceProps) {
  return (
    <div
      className={clsx(
        "glass-panel rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-300 border border-zinc-800/80 backdrop-blur-2xl bg-zinc-950/80",
        className
      )}
    >
      {showWindowDots && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition cursor-pointer" />
          </div>
          {title && <span className="text-xs font-mono text-zinc-400 font-medium tracking-wide uppercase">{title}</span>}
          <div className="w-12" />
        </div>
      )}
      <div className={padding}>{children}</div>
    </div>
  );
}
