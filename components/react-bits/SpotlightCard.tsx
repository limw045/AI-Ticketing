"use client";

import React from "react";
import { clsx } from "clsx";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
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
        "porcelain-card rounded-2xl bg-[#131316] border border-white/10 p-5 hover:border-white/25 transition-all duration-200 text-white relative",
        className
      )}
    >
      {children}
    </div>
  );
}
