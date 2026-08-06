"use client";

import { useEffect, useState } from "react";

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
}

export function CountUp({ to, from = 0, duration = 1000, className = "" }: CountUpProps) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * (to - from) + from));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [to, from, duration]);

  return <span className={className}>{count.toLocaleString()}</span>;
}
