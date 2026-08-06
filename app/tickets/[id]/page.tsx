"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { GlassSurface } from "@/components/react-bits/GlassSurface";
import { ShinyText } from "@/components/react-bits/ShinyText";
import { exportTicketPDF } from "@/lib/pdf-export";
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

    // Fetch Ticket
    const { data: ticketData } = await supabase
      .from("tickets")
      .select("*, author:profiles!tickets_author_id_fkey(*), assignee:profiles!tickets_assignee_id_fkey(*)")
      .eq("id", ticketId)
      .single();

    if (ticketData) setTicket(ticketData);

    // Fetch Comments
    const { data: commentData } = await supabase
      .from("comments")
      .select("*, author:profiles(*)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (commentData) setComments(commentData);

    // Fetch Agents for Assignee dropdown
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
      <div className="min-h-screen bg-mac-bg text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-500 text-sm font-mono animate-pulse">Loading Ticket #{ticketId}...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-mac-bg text-zinc-100 p-8 text-center">
        Ticket not found or access restricted.
      </div>
    );
  }

  const subtasks = ticket.subtasks || [];
  const completedSubtasks = subtasks.filter((st: any) => st.completed).length;
  const subtaskProgressPct = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-mac-bg text-zinc-100 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content Column (75%) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header Glass Surface */}
            <GlassSurface showWindowDots title={`Ticket #${ticket.ticket_number}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        ticket.status === "open"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : ticket.status === "in_progress"
                          ? "bg-indigo-950 text-indigo-400 border border-indigo-800"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {ticket.status}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">{ticket.category}</span>
                    {ticket.priority === "urgent" && (
                      <ShinyText text="⚡ P0 URGENT" className="text-amber-400 text-xs font-bold" />
                    )}
                  </div>

                  <h1 className="text-2xl font-bold text-zinc-100">{ticket.title}</h1>
                </div>

                <button
                  onClick={() => exportTicketPDF(ticket)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 flex items-center gap-1.5 border border-zinc-700 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </button>
              </div>

              {/* Author Banner */}
              <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center gap-3 text-xs text-zinc-400">
                <User className="w-4 h-4 text-blue-400" />
                <span>
                  Opened by <strong className="text-zinc-200">{ticket.author?.display_name}</strong> (
                  {ticket.author?.user_type === "intern" ? (
                    <span className="text-amber-400 font-bold">Intern</span>
                  ) : (
                    <span className="text-zinc-300">Staff - {ticket.author?.department}</span>
                  )}
                  ) on {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
            </GlassSurface>

            {/* Description Body */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Issue Description</h3>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed font-mono whitespace-pre-wrap text-zinc-200">
                {ticket.description}
              </div>
            </div>

            {/* Sub-task Checklist */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Sub-task Checklist ({completedSubtasks}/{subtasks.length})
                </h3>
                <span className="text-xs font-mono text-blue-400">{subtaskProgressPct}% Complete</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${subtaskProgressPct}%` }}
                />
              </div>

              <div className="space-y-2">
                {subtasks.map((st: any) => (
                  <div
                    key={st.id}
                    onClick={() => handleToggleSubtask(st.id)}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition"
                  >
                    {st.completed ? (
                      <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}
                    <span className={`text-xs ${st.completed ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add subtask input */}
              <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add new subtask step..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-blue-500"
                />
                <button type="submit" className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Timeline Comments */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Timeline & Discussion ({comments.length})
              </h3>

              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-5 rounded-2xl border ${
                    comment.is_internal_note
                      ? "bg-amber-950/40 border-amber-600/60 text-amber-100"
                      : "glass-panel text-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-zinc-200">
                        {comment.author?.display_name || "System"}
                      </span>
                      {comment.is_internal_note && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/80 text-amber-300 border border-amber-600/60 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Internal Note (Agents Only)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-mono whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}

              {/* Reply Box */}
              <form onSubmit={handlePostComment} className="glass-panel p-5 rounded-2xl space-y-4">
                <textarea
                  rows={4}
                  placeholder="Leave a comment or reply..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono focus:outline-none focus:border-blue-500"
                />

                <div className="flex items-center justify-between">
                  {isAgent ? (
                    <label className="flex items-center gap-2 text-xs text-amber-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded bg-zinc-950 border-amber-600 text-amber-500"
                      />
                      <span className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Post as Internal Note (Hidden from employee)
                      </span>
                    </label>
                  ) : <div />}

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Reply
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar Column (25%) */}
          <div className="space-y-6">
            {/* Status & Assignment Box */}
            <GlassSurface className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                  Status
                </label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-200"
                >
                  <option value="open">🟢 Open</option>
                  <option value="in_progress">🟣 In Progress</option>
                  <option value="resolved">⚪ Resolved</option>
                  <option value="closed">⚪ Closed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                  Assignee
                </label>
                <select
                  value={ticket.assignee_id || ""}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
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

            {/* Reporter Profile Summary Card */}
            <GlassSurface className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Reporter Info</h3>
              <div>
                <span className="font-bold text-sm text-zinc-100 block">{ticket.author?.display_name}</span>
                <span className="text-xs font-mono text-zinc-400 block mt-0.5">{ticket.author?.email}</span>
                <div className="mt-2 flex items-center gap-2">
                  {ticket.author?.user_type === "intern" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-600/60">
                      Intern (Supervisor: {ticket.author?.supervisor_name || "N/A"})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Staff ({ticket.author?.department})
                    </span>
                  )}
                </div>
              </div>
            </GlassSurface>

            {/* Device & System Logs Panel */}
            <GlassSurface className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-blue-400" /> Device Context
              </h3>
              {ticket.device_context ? (
                <div className="space-y-1.5 text-xs font-mono text-zinc-400">
                  <p><strong className="text-zinc-300">Screen:</strong> {ticket.device_context.screenResolution}</p>
                  <p className="truncate"><strong className="text-zinc-300">Browser:</strong> {ticket.device_context.userAgent}</p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No device context attached.</p>
              )}
            </GlassSurface>
          </div>
        </div>
      </main>
    </div>
  );
}
