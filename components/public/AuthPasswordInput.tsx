"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/FormField";

export function AuthPasswordInput({
  className = "",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Input {...props} type={visible ? "text" : "password"} className={`pr-12 ${className}`} />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
        className="absolute right-1 top-1 flex h-[42px] w-[42px] items-center justify-center rounded-lg text-[var(--muted)] transition hover:text-[var(--brand-ink)]"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </>
  );
}
