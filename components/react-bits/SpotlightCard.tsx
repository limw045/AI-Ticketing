"use client";

import React from "react";
import { clsx } from "clsx";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  spotlightColor?: string;
}

export function SpotlightCard({
  children,
  className = "",
  onClick,
}: SpotlightCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "porcelain-card rounded-2xl bg-white border border-black/5 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-black/10 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 text-zinc-900",
        className
      )}
    >
      {children}
    </div>
  );
}
