"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Search } from "lucide-react";
import { StatusBadge, statusTone, priorityTone } from "@/components/ui/StatusBadge";
import { buildRequestActivity } from "@/lib/request-activity";
import { ticketStatusLabel } from "@/lib/display-labels";

export interface OverviewTicket {
  id: string;
  ticket_number: number;
  title: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  resolved_at?: string | null;
  author?: { display_name?: string } | null;
}

const stages = [
  { status: "open", label: "Open", color: "var(--info)" },
  { status: "in_progress", label: "In progress", color: "var(--info)" },
  { status: "resolved", label: "Resolved", color: "var(--success)" },
  { status: "closed", label: "Closed", color: "var(--faint)" },
];

export function TicketActivity({ tickets }: { tickets: OverviewTicket[] }) {
  const [days, setDays] = useState(30);
  const series = useMemo(() => buildRequestActivity(tickets, days), [days, tickets]);
  const opened = series.reduce((sum, day) => sum + day.opened, 0);
  const resolved = series.reduce((sum, day) => sum + day.resolved, 0);
  const peak = Math.max(0, ...series.flatMap(day => [day.opened, day.resolved]));

  const scale = Math.max(1, peak);

  return (
    <section className="ticket-activity" aria-labelledby="activity-title">
      <div className="activity-heading">
        <div><h2 id="activity-title">Request activity</h2><p>A daily view of requests received and resolved.</p></div>
        <label className="activity-period"><CalendarDays size={14} /><select aria-label="Activity date range" value={days} onChange={e => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label>
      </div>
      <div className="activity-body">
        <div className="activity-summary"><span>Requests received</span><strong>{opened}</strong><p><span className="activity-resolved">{resolved} resolved</span> in this period</p></div>
        <div className="activity-chart">
          <div className="activity-legend"><span><i /> Received</span><span><i /> Resolved</span></div>
          <div className="activity-plot" role="img" aria-label={`${opened} requests received and ${resolved} resolved in the last ${days} days. Peak daily count: ${peak}.`}>
            <div className="activity-axis"><span>{scale}</span><span>0</span></div>
            {series.map(day => <div className="activity-day" key={day.label} title={`${day.label}: ${day.opened} received, ${day.resolved} resolved`}><span style={{ height: `${day.opened / scale * 100}%` }} /><span style={{ height: `${day.resolved / scale * 100}%` }} /></div>)}
            {opened === 0 && resolved === 0 && <p className="activity-empty">No request activity in this period</p>}
          </div>
          <div className="activity-dates"><span>{series[0].label}</span><span>{series[series.length - 1].label}</span></div>
        </div>
      </div>
      <div className="activity-stages" aria-label="Current request status across all dates">
        {stages.map(stage => {
          const count = tickets.filter(t => t.status === stage.status).length;
          return <div key={stage.status}><span>{stage.label}</span><div><strong>{count}</strong><small>{tickets.length ? Math.round(count / tickets.length * 100) : 0}%</small></div><div className="stage-track"><span style={{ width: `${tickets.length ? count / tickets.length * 100 : 0}%`, background: stage.color }} /></div></div>;
        })}
      </div>
    </section>
  );
}

export function RecentRequests({ tickets, personal = false }: { tickets: OverviewTicket[]; personal?: boolean }) {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const filtered = tickets.filter(t => (status === "all" || t.status === status) && `${t.title} ${t.ticket_number} ${t.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  return (
    <section className="recent-requests" aria-labelledby="recent-title">
      <div className="recent-heading"><h2 id="recent-title">{personal ? "Your requests" : "Latest requests"}</h2><Link href={personal ? "/tickets?mine=1" : "/tickets"}>View all requests <ArrowUpRight size={14} /></Link></div>
      <div className="recent-toolbar"><div className="workspace-tabs" role="group" aria-label="Filter recent requests"><button onClick={() => setStatus("all")} aria-pressed={status === "all"}>All requests</button>{stages.map(s => <button key={s.status} onClick={() => setStatus(s.status)} aria-pressed={status === s.status}>{s.label}</button>)}</div><label className="recent-search"><Search size={14} /><input aria-label="Search recent requests" placeholder="Search requests…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
      <div className="recent-table-scroll"><table className="recent-table"><thead><tr><th>Request</th><th>Status</th><th>Priority</th><th>Category</th><th>Created</th></tr></thead><tbody>{filtered.map(ticket => <tr key={ticket.id}><td><Link href={`/tickets/${ticket.id}`}><span className="request-id">#{ticket.ticket_number}</span><span>{ticket.title}</span></Link></td><td><StatusBadge tone={statusTone(ticket.status)}>{ticketStatusLabel(ticket.status)}</StatusBadge></td><td><StatusBadge tone={priorityTone(ticket.priority)}>{ticket.priority}</StatusBadge></td><td>{ticket.category}</td><td>{new Date(ticket.created_at).toLocaleDateString("en-GB", {day: "numeric", month: "short"})}</td></tr>)}</tbody></table></div>
      {filtered.length === 0 && <div className="recent-empty"><Search size={22} /><h3>{tickets.length ? "No matching requests" : "Your requests will appear here"}</h3><p>{tickets.length ? "Try another search or choose a different status." : "Create a request whenever you need a hand from the team."}</p>{!tickets.length && <Link href="/tickets/new">Create your first request <ArrowUpRight size={14} /></Link>}</div>}
      <p className="recent-count">Showing {filtered.length} of {tickets.length} requests</p>
    </section>
  );
}
