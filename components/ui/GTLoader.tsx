import { cn } from "@/lib/cn";

export function GTLoader({
  className = "",
  fullCanvas = false,
  delayed = false,
  label = "Loading",
}: {
  className?: string;
  fullCanvas?: boolean;
  delayed?: boolean;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "gt-loader",
        fullCanvas && "gt-loader--canvas",
        delayed && "gt-loader--delayed",
        className
      )}
    >
      <span className="gt-loader__mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" focusable="false">
          <path className="gt-loader__letters" d="M19 12.5h-4.5a9.5 9.5 0 1 0 0 19H20V23h-6m9.5-10.5h17m-8.5 0v19" />
          <circle className="gt-loader__track" cx="24" cy="24" r="20" />
          <circle className="gt-loader__dot" cx="24" cy="4" r="2.4" />
        </svg>
      </span>
      <span className="gt-loader__label">{label}</span>
    </div>
  );
}
