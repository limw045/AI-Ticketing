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
        <svg viewBox="0 0 44 44" focusable="false">
          <path
            className="gt-loader__track"
            pathLength="100"
            d="M10 10C2 10 2 34 12 34H19V23H11M22 10H42M32 10V34"
          />
          <path
            className="gt-loader__route"
            pathLength="100"
            d="M10 10C2 10 2 34 12 34H19V23H11M22 10H42M32 10V34"
          />
        </svg>
        <span className="gt-loader__dot" />
      </span>
      <span className="gt-loader__label">{label}</span>
    </div>
  );
}
