"use client";

import { useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import { Button, Input } from "@/components/ui/FormField";

export function RegistrationLink() {
  const [url, setUrl] = useState("");
  const [notice, setNotice] = useState("");
  const copy = async () => {
    const registrationUrl = new URL("/register", window.location.origin).href;
    setUrl(registrationUrl);
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setNotice("Registration link copied. Share it with the staff member.");
    } catch {
      setNotice("Select and copy the link below to share it with the staff member.");
    }
  };
  return (
    <section className="surface p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)]"><UserPlus className="h-4 w-4 text-[var(--brand-ink)]" /></span>
          <div>
            <h2 className="font-display text-base font-bold">Share staff registration</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Send this link to staff so they can create their own account. New accounts start as Employee.</p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={() => void copy()}><Copy className="h-4 w-4" />Copy registration link</Button>
      </div>
      <p role="status" className="mt-2 text-sm text-[var(--muted)]">{notice}</p>
      {url && <Input aria-label="Staff registration link" readOnly value={url} onFocus={(event) => event.target.select()} />}
    </section>
  );
}
