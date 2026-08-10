"use client";

import { useState } from "react";
import { Trash2, Check } from "lucide-react";
import { cn } from "@/lib/cn";

export function AdminTable({
  header,
  children,
  className = "",
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface overflow-hidden", className)}>
      {header && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
          {header}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    </section>
  );
}

export function AdminThead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[var(--line)] bg-[var(--surface-2)]">
        {children}
      </tr>
    </thead>
  );
}

export function AdminTh({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]",
        className
      )}
    >
      {children}
    </th>
  );
}

export function AdminTd({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>
  );
}

export function TwoStepDelete({
  onConfirm,
  label = "Delete",
  className = "",
}: {
  onConfirm: () => Promise<void> | void;
  label?: string;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setConfirming(false);
    await onConfirm();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
        confirming
          ? "bg-[var(--danger)] text-white"
          : "bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white",
        className
      )}
    >
      {confirming ? (
        <>
          <Check className="h-3.5 w-3.5" /> Confirm?
        </>
      ) : (
        <>
          <Trash2 className="h-3.5 w-3.5" /> {label}
        </>
      )}
    </button>
  );
}

export function AdminToolbar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface flex flex-wrap items-center justify-between gap-4 p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
