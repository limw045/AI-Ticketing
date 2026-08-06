import React from "react";
import { clsx } from "clsx";

interface ShinyTextProps {
  text: string;
  className?: string;
  disabled?: boolean;
  speed?: number;
}

export function ShinyText({
  text,
  className = "",
  disabled = false,
  speed = 5,
}: ShinyTextProps) {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={clsx(
        "inline-block bg-clip-text text-transparent bg-[linear-gradient(110deg,#a1a1aa,45%,#ffffff,55%,#a1a1aa)] bg-[length:200%_100%]",
        !disabled && "animate-shiny-shimmer",
        className
      )}
      style={{
        animationDuration: animationDuration,
      }}
    >
      {text}
    </span>
  );
}
