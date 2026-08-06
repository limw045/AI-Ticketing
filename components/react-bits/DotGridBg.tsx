"use client";

import React from "react";

export function DotGridBg() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 opacity-40 overflow-hidden">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dot-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" className="fill-slate-300" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-pattern)" />
      </svg>
      {/* Ambient gradient glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-400/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-amber-400/15 rounded-full blur-3xl" />
    </div>
  );
}
