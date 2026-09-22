"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui/FormField";

export interface EditableSubtask {
  id: string;
  title: string;
  completed: boolean;
  [key: string]: unknown;
}

export function SubtaskEditor({ value, onChange, disabled = false }: {
  value: EditableSubtask[];
  onChange: (value: EditableSubtask[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="subtask-editor md:col-span-2">
      <legend className="text-sm font-medium">Subtasks</legend>
      <p className="mt-2 text-xs text-[var(--muted)]">Break the request into smaller steps. Changes are saved with the ticket.</p>
      <div className="mt-4 space-y-2">
        {value.map((task, index) => (
          <div key={task.id} className="flex items-center gap-3 rounded-lg border border-[var(--line)] px-3 py-2">
            <input type="checkbox" checked={task.completed} aria-label={`Mark subtask ${index + 1} complete`} onChange={event => onChange(value.map((item, i) => i === index ? { ...item, completed: event.target.checked } : item))} className="h-4 w-4 shrink-0" />
            <Input aria-label={`Subtask ${index + 1} title`} placeholder="What needs to be done?" value={task.title} required onChange={event => onChange(value.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} className={task.completed ? "!border-0 !bg-transparent line-through text-[var(--muted)]" : "!border-0 !bg-transparent"} />
            <button type="button" aria-label={`Remove subtask ${index + 1}`} onClick={() => onChange(value.filter((_, i) => i !== index))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"><Trash2 size={16} /></button>
          </div>
        ))}
        {!value.length && <p className="rounded-lg border border-dashed border-[var(--line-strong)] p-4 text-sm text-[var(--muted)]">No subtasks yet. Add a step when you need one.</p>}
      </div>
      <Button type="button" variant="secondary" className="mt-3" disabled={disabled} onClick={() => onChange([...value, { id: crypto.randomUUID(), title: "", completed: false }])}><Plus size={15} /> Add subtask</Button>
    </fieldset>
  );
}
