"use client";

import React from "react";

export function DotGridBg() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 opacity-25 overflow-hidden">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dot-pattern-light" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" className="fill-zinc-700" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-pattern-light)" />
      </svg>
    </div>
  );
}
