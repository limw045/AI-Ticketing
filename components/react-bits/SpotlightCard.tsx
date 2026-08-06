"use client";

import React, { useState } from "react";
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
  spotlightColor = "rgba(59, 130, 246, 0.08)",
}: SpotlightCardProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={clsx(
        "relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 p-5 transition-all duration-300 hover:border-blue-300 hover:shadow-lg shadow-sm shadow-slate-200/50 text-slate-800",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
