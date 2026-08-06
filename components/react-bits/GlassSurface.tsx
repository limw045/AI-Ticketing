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
        "porcelain-card rounded-2xl relative overflow-hidden bg-[#121214] border border-white/10 shadow-2xl",
        className
      )}
    >
      {showWindowDots && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          </div>
          {title && <span className="text-[11px] font-mono tracking-widest text-zinc-500 uppercase">{title}</span>}
          <div className="w-12" />
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
