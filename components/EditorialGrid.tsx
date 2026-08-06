"use client";

import React from "react";

export function EditorialGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 max-w-7xl mx-auto px-6 grid grid-cols-3 divide-x divide-white/10 opacity-70">
      <div className="relative border-l border-white/10">
        <span className="absolute top-16 -left-[5px] text-[10px] text-zinc-600 font-mono">+</span>
        <span className="absolute bottom-16 -left-[5px] text-[10px] text-zinc-600 font-mono">+</span>
      </div>
      <div className="relative">
        <span className="absolute top-16 -left-[5px] text-[10px] text-zinc-600 font-mono">+</span>
        <span className="absolute bottom-16 -left-[5px] text-[10px] text-zinc-600 font-mono">+</span>
      </div>
      <div className="relative border-r border-white/10">
        <span className="absolute top-16 -left-[5px] text-[10px] text-zinc-600 font-mono">+</span>
        <span className="absolute top-16 -right-[5px] text-[10px] text-zinc-600 font-mono">+</span>
        <span className="absolute bottom-16 -left-[5px] text-[10px] text-zinc-600 font-mono">+</span>
        <span className="absolute bottom-16 -right-[5px] text-[10px] text-zinc-600 font-mono">+</span>
      </div>
    </div>
  );
}
