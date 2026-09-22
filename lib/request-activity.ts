export interface ActivityTicket {
  created_at: string;
  resolved_at?: string | null;
}

/** Calendar-day buckets in the viewer's local timezone; future events are excluded. */
export function buildRequestActivity(tickets: ActivityTicket[], days: number, now = new Date()) {
  if (!Number.isInteger(days) || days < 1 || days > 366) throw new RangeError("Activity range must be between 1 and 366 days.");
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, i) => {
    const start = new Date(end);
    start.setDate(end.getDate() - days + i + 1);
    const next = new Date(start);
    next.setDate(start.getDate() + 1);
    const within = (value?: string | null) => {
      if (!value) return false;
      const date = new Date(value);
      return date >= start && date < next && date <= now;
    };
    return {
      label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      opened: tickets.filter(ticket => within(ticket.created_at)).length,
      resolved: tickets.filter(ticket => within(ticket.resolved_at)).length,
    };
  });
}
