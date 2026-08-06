import React from "react";
import { clsx } from "clsx";

interface ShinyTextProps {
  text: string;
  className?: string;
}

export function ShinyText({ text, className }: ShinyTextProps) {
  return (
    <span
      className={clsx(
        "inline-block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-[length:200%_100%] bg-clip-text text-transparent animate-pulse font-bold",
        className
      )}
    >
      {text}
    </span>
  );
}
