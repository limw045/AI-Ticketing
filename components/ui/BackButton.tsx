import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

export function BackButton({ href, label = "Back", className = "" }: { href: string; label?: string; className?: string }) {
  return (
    <Link href={href} className={cn("arrow-action arrow-action--back", className)}>
      <ArrowLeft className="arrow-action__icon h-4 w-4" aria-hidden="true" />
      <span className="arrow-action__label">{label}</span>
    </Link>
  );
}
