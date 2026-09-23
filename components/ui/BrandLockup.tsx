import Image from "next/image";
import { cn } from "@/lib/cn";
import styles from "./BrandLockup.module.css";

export function BrandMark({
  className = "",
  size = 34,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block shrink-0 overflow-hidden rounded-lg", styles.mark, className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/ticketing-logo.png"
        alt=""
        width={1254}
        height={1254}
        sizes="64px"
        className={styles.lightLogo}
      />
      <Image
        src="/brand/ticketing-logo-dark.png"
        alt=""
        width={1254}
        height={1254}
        sizes="64px"
        className={styles.darkLogo}
      />
    </span>
  );
}

export function BrandLockup({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <BrandMark size={compact ? 28 : 34} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-bold text-[var(--ink)]">
          Grant Thornton
        </span>
        {!compact && (
          <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            AI Department
          </span>
        )}
      </span>
    </span>
  );
}
