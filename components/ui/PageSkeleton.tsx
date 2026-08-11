import { cn } from "@/lib/cn";

export type PageSkeletonVariant =
  | "dashboard"
  | "table"
  | "ticket-detail"
  | "profile"
  | "notifications";

function Line({ className = "" }: { className?: string }) {
  return <span className={cn("skeleton-block", className)} aria-hidden="true" />;
}

export function PageSkeleton({
  variant,
  className = "",
}: {
  variant: PageSkeletonVariant;
  className?: string;
}) {
  if (variant === "profile") {
    return (
      <div className={cn("skeleton-profile", className)} data-skeleton="profile" aria-label="Loading profile" role="status">
        <Line className="skeleton-profile__avatar" />
        <span className="skeleton-profile__copy">
          <Line className="h-3 w-24" />
          <Line className="h-2.5 w-16" />
        </span>
      </div>
    );
  }

  if (variant === "notifications") {
    return (
      <div className={cn("skeleton-notifications", className)} data-skeleton="notifications" aria-label="Loading notifications" role="status">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="skeleton-notification" key={index}>
            <Line className="h-2 w-2 shrink-0 rounded-full" />
            <span className="min-w-0 flex-1 space-y-2">
              <Line className="h-3 w-2/3" />
              <Line className="h-2.5 w-full" />
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("skeleton-page skeleton-table", className)} data-skeleton="table" aria-label="Loading table" role="status">
        <div className="skeleton-table__head">{Array.from({ length: 5 }, (_, i) => <Line key={i} className="h-3" />)}</div>
        {Array.from({ length: 6 }, (_, row) => (
          <div className="skeleton-table__row" key={row}>{Array.from({ length: 5 }, (_, col) => <Line key={col} className="h-3" />)}</div>
        ))}
      </div>
    );
  }

  if (variant === "ticket-detail") {
    return (
      <div className={cn("skeleton-page space-y-8", className)} data-skeleton="ticket-detail" aria-label="Loading ticket details" role="status">
        <div className="space-y-3"><Line className="h-4 w-32" /><Line className="h-8 w-2/3" /><Line className="h-3 w-1/2" /></div>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2"><div className="surface space-y-4 p-6"><Line className="h-4 w-28" />{Array.from({ length: 4 }, (_, i) => <Line key={i} className="h-4 w-full" />)}</div><div className="surface space-y-3 p-6"><Line className="h-4 w-36" /><Line className="h-28 w-full" /></div></div>
          <div className="surface space-y-5 p-5"><Line className="h-3 w-20" /><Line className="h-11 w-full" /><Line className="h-3 w-24" /><Line className="h-11 w-full" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("skeleton-page space-y-8", className)} data-skeleton="dashboard" aria-label="Loading dashboard" role="status">
      <div className="space-y-3"><Line className="h-3 w-40" /><Line className="h-9 w-3/5" /><Line className="h-3 w-2/5" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div className="surface space-y-5 p-5" key={i}><Line className="h-3 w-24" /><Line className="h-8 w-16" /></div>)}</div>
      <div className="surface space-y-4 p-6"><Line className="h-5 w-40" />{Array.from({ length: 4 }, (_, i) => <Line key={i} className="h-10 w-full" />)}</div>
    </div>
  );
}
