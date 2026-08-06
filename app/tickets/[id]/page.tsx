"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { GlassSurface } from "@/components/react-bits/GlassSurface";
import { exportTicketPDF } from "@/lib/pdf-export";
import { EditorialGrid } from "@/components/EditorialGrid";
import {
  Clock, CheckCircle2, User, ShieldAlert, Lock, Send, Plus, CheckSquare, Square,
  Download, RotateCcw, AlertTriangle, Monitor, Sparkles, UserCheck, Tag
} from "lucide-react";

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;

  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const isAgent = currentUserProfile?.role === "support_agent" || currentUserProfile?.role === "admin";

  const fetchTicketDetails = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUserProfile(profile);
    }

    const { data: ticketData } = await supabase
      .from("tickets")
      .select("*, author:profiles!tickets_author_id_fkey(*), assignee:profiles!tickets_assignee_id_fkey(*)")
      .eq("id", ticketId)
      .single();

    if (ticketData) setTicket(ticketData);

    const { data: commentData } = await supabase
      .from("comments")
      .select("*, author:profiles(*)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (commentData) setComments(commentData);

    const { data: agentData } = await supabase
      .from("profiles")
      .select("*")
      .in("role", ["support_agent", "admin"]);

    if (agentData) setAgents(agentData);
    setLoading(false);
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserProfile) return;

    const supabase = createClient();
    const { error } = await supabase.from("comments").insert({
      ticket_id: ticketId,
      author_id: currentUserProfile.id,
      content: newComment,
      is_internal_note: isInternalNote,
    });

    if (!error) {
      setNewComment("");
      setIsInternalNote(false);
      fetchTicketDetails();
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    const supabase = createClient();
    const updates: any = { status: newStatus };
    if (newStatus === "resolved" || newStatus === "closed") {
      updates.resolved_at = new Date().toISOString();
    }
    await supabase.from("tickets").update(updates).eq("id", ticketId);
    fetchTicketDetails();
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    const supabase = createClient();
    await supabase
      .from("tickets")
      .update({ assignee_id: assigneeId || null })
      .eq("id", ticketId);
    fetchTicketDetails();
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !ticket) return;

    const currentSubtasks = ticket.subtasks || [];
    const updated = [
      ...currentSubtasks,
      { id: Date.now().toString(), title: newSubtaskTitle, completed: false },
    ];

    const supabase = createClient();
    await supabase.from("tickets").update({ subtasks: updated }).eq("id", ticketId);
    setNewSubtaskTitle("");
    fetchTicketDetails();
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!ticket) return;
    const currentSubtasks = ticket.subtasks || [];
    const updated = currentSubtasks.map((st: any) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const supabase = createClient();
    await supabase.from("tickets").update({ subtasks: updated }).eq("id", ticketId);
    fetchTicketDetails();
  };

  if (loading) {
    return (
      <div className="editorial-shell flex min-h-screen items-center justify-center">
        <div className="editorial-mono text-xs uppercase tracking-widest text-zinc-600 animate-pulse">Loading request #{ticketId}...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="editorial-shell p-8 text-center text-zinc-400">
        Ticket not found or access restricted.
      </div>
    );
  }

  const subtasks = ticket.subtasks || [];
  const completedSubtasks = subtasks.filter((st: any) => st.completed).length;
  const subtaskProgressPct = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  return (
    <div className="editorial-shell pb-20">
      <EditorialGrid />
      <Navbar />

      <main className="editorial-content max-w-7xl mx-auto px-6 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content Column (75%) */}
          <div className="lg:col-span-3 space-y-6">
            <GlassSurface showWindowDots title={`Ticket #${ticket.ticket_number}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="editorial-mono mb-3 flex items-center gap-3 text-[10px] uppercase tracking-widest">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        ticket.status === "open"
                          ? "bg-[#788c5d]/15 text-[#a4b889] border border-[#788c5d]/35"
                          : ticket.status === "in_progress"
                          ? "bg-[#6a9bcc]/15 text-[#8db3d6] border border-[#6a9bcc]/35"
                          : "bg-zinc-800 text-zinc-400 border border-white/10"
                      }`}
                    >
                      {ticket.status}
                    </span>
                    <span className="text-zinc-500">{ticket.category}</span>
                    {ticket.priority === "urgent" && (
                      <span className="rounded border border-rose-400/30 bg-rose-400/10 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-rose-200">
                        ⚡ P0 URGENT
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl font-light tracking-[-0.05em] text-white">{ticket.title}</h1>
                </div>

                <button
                  onClick={() => exportTicketPDF(ticket)}
                  className="editorial-mono flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900 px-3.5 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-300 transition hover:border-white/25 hover:text-white"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </button>
              </div>

              <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4 text-xs text-zinc-500">
                <User className="w-4 h-4 text-[#8db3d6]" />
                <span>
                  Opened by <strong className="text-white">{ticket.author?.display_name}</strong> (
                  {ticket.author?.user_type === "intern" ? (
                    <span className="font-bold text-[#e0a58b]">Intern</span>
                  ) : (
                    <span className="text-zinc-300">Staff - {ticket.author?.department}</span>
                  )}
                  ) on {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
            </GlassSurface>

            {/* Description Body */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <h3 className="editorial-mono text-[10px] font-bold uppercase tracking-widest text-zinc-600">01 / Issue Description</h3>
              <div className="max-w-none rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                {ticket.description}
              </div>
            </div>

            {/* Sub-task Checklist */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="editorial-mono text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  02 / Sub-task Checklist ({completedSubtasks}/{subtasks.length})
                </h3>
                <span className="editorial-mono text-[10px] font-bold text-[#8db3d6]">{subtaskProgressPct}% Complete</span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/10 bg-zinc-900">
                <div
                  className="h-full rounded-full bg-[#6a9bcc] transition-all duration-300"
                  style={{ width: `${subtaskProgressPct}%` }}
                />
              </div>

              <div className="space-y-2">
                {subtasks.map((st: any) => (
                  <div
                    key={st.id}
                    onClick={() => handleToggleSubtask(st.id)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 transition hover:border-white/25"
                  >
                    {st.completed ? (
                      <CheckSquare className="h-4 w-4 shrink-0 text-[#8db3d6]" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0 text-zinc-700" />
                    )}
                    <span className={`text-xs font-medium ${st.completed ? "line-through text-zinc-600" : "text-zinc-300"}`}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add new subtask step..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 border border-white/10 bg-[#0a0a0c] px-3.5 py-2.5 text-xs font-medium text-white outline-none focus:border-[#6a9bcc]"
                />
                <button type="submit" className="rounded-full border border-white/10 bg-zinc-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-700">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Timeline Comments */}
            <div className="space-y-4">
              <h3 className="editorial-mono text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                03 / Timeline & Discussion ({comments.length})
              </h3>

              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-5 rounded-3xl border ${
                    comment.is_internal_note
                      ? "bg-[#1a1414] border-[#d97757]/30 text-[#e0a58b]"
                      : "editorial-bubble text-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">
                        {comment.author?.display_name || "System"}
                      </span>
                      {comment.is_internal_note && (
                        <span className="editorial-mono flex items-center gap-1 rounded border border-[#d97757]/30 bg-[#d97757]/10 px-2 py-0.5 text-[10px] font-bold text-[#e0a58b]">
                          <Lock className="h-3 w-3" /> Internal Note
                        </span>
                      )}
                    </div>
                    <span className="editorial-mono text-[10px] font-semibold text-zinc-600">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                </div>
              ))}

              {/* Reply Box */}
              <form onSubmit={handlePostComment} className="glass-panel rounded-2xl p-5 space-y-4">
                <textarea
                  rows={4}
                  placeholder="Leave a comment or reply..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                  className="w-full border border-white/10 bg-[#0a0a0c] p-4 text-sm font-mono text-white outline-none focus:border-[#6a9bcc]"
                />

                <div className="flex items-center justify-between">
                  {isAgent ? (
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#e0a58b]">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded border-white/20 bg-zinc-900 text-[#e0a58b] focus:ring-0"
                      />
                    <span className="editorial-mono flex items-center gap-1 text-[10px] uppercase tracking-wider">
                        <Lock className="w-3.5 h-3.5" /> Post as Internal Note (Hidden from employee)
                      </span>
                    </label>
                  ) : <div />}

                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-full bg-[#6a9bcc] px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-md shadow-blue-500/20 hover:bg-[#84add1]"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Reply
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar Column (25%) */}
          <div className="space-y-6">
            <GlassSurface className="space-y-4">
              <div>
                <label className="editorial-mono mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  04 / Status
                </label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="w-full border border-white/10 bg-[#0a0a0c] p-3 text-xs font-bold text-white outline-none focus:border-[#6a9bcc]"
                >
                  <option value="open">🟢 Open</option>
                  <option value="in_progress">🟣 In Progress</option>
                  <option value="resolved">⚪ Resolved</option>
                  <option value="closed">⚪ Closed</option>
                </select>
              </div>

              <div>
                <label className="editorial-mono mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  05 / Assignee
                </label>
                <select
                  value={ticket.assignee_id || ""}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full border border-white/10 bg-[#0a0a0c] p-3 text-xs font-medium text-white outline-none focus:border-[#6a9bcc]"
                >
                  <option value="">Unassigned</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.display_name} ({agent.department})
                    </option>
                  ))}
                </select>
              </div>
            </GlassSurface>

            <GlassSurface className="space-y-3">
              <h3 className="editorial-mono text-[10px] font-bold uppercase tracking-widest text-zinc-600">06 / Reporter Info</h3>
              <div>
                <span className="block text-sm font-bold text-white">{ticket.author?.display_name}</span>
                <span className="mt-0.5 block text-xs font-medium text-zinc-500">{ticket.author?.email}</span>
                <div className="mt-2 flex items-center gap-2">
                  {ticket.author?.user_type === "intern" ? (
                    <span className="rounded border border-[#d97757]/30 bg-[#d97757]/10 px-2 py-0.5 text-[10px] font-bold text-[#e0a58b]">
                      Intern (Supervisor: {ticket.author?.supervisor_name || "N/A"})
                    </span>
                  ) : (
                    <span className="rounded border border-white/10 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                      Staff ({ticket.author?.department})
                    </span>
                  )}
                </div>
              </div>
            </GlassSurface>

            <GlassSurface className="space-y-3">
              <h3 className="editorial-mono flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                <Monitor className="w-3.5 h-3.5 text-[#8db3d6]" /> System Context
              </h3>
              {ticket.device_context ? (
                <div className="space-y-1.5 text-xs font-mono text-zinc-500">
                  <p><strong className="text-zinc-200">Screen:</strong> {ticket.device_context.screenResolution}</p>
                  <p className="truncate"><strong className="text-zinc-200">Browser:</strong> {ticket.device_context.userAgent}</p>
                </div>
              ) : (
                <p className="text-xs text-zinc-600">No device context attached.</p>
              )}
            </GlassSurface>
          </div>
        </div>
      </main>
    </div>
  );
}
