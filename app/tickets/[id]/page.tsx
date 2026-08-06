"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { GlassSurface } from "@/components/react-bits/GlassSurface";
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
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
        <div className="text-slate-400 text-sm font-semibold animate-pulse">Loading Ticket #{ticketId}...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 p-8 text-center">
        Ticket not found or access restricted.
      </div>
    );
  }

  const subtasks = ticket.subtasks || [];
  const completedSubtasks = subtasks.filter((st: any) => st.completed).length;
  const subtaskProgressPct = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content Column (75%) */}
          <div className="lg:col-span-3 space-y-6">
            <GlassSurface showWindowDots title={`Ticket #${ticket.ticket_number}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        ticket.status === "open"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : ticket.status === "in_progress"
                          ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                          : "bg-slate-100 text-slate-600 border border-slate-300"
                      }`}
                    >
                      {ticket.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{ticket.category}</span>
                    {ticket.priority === "urgent" && (
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300 uppercase">
                        ⚡ P0 URGENT
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl font-extrabold text-slate-900">{ticket.title}</h1>
                </div>

                <button
                  onClick={() => exportTicketPDF(ticket)}
                  className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 border border-slate-200 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-500">
                <User className="w-4 h-4 text-blue-600" />
                <span>
                  Opened by <strong className="text-slate-800">{ticket.author?.display_name}</strong> (
                  {ticket.author?.user_type === "intern" ? (
                    <span className="text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">Intern</span>
                  ) : (
                    <span className="text-slate-700">Staff - {ticket.author?.department}</span>
                  )}
                  ) on {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
            </GlassSurface>

            {/* Description Body */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Description</h3>
              <div className="prose max-w-none text-sm leading-relaxed font-mono whitespace-pre-wrap text-slate-800 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                {ticket.description}
              </div>
            </div>

            {/* Sub-task Checklist */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Sub-task Checklist ({completedSubtasks}/{subtasks.length})
                </h3>
                <span className="text-xs font-bold text-blue-600">{subtaskProgressPct}% Complete</span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${subtaskProgressPct}%` }}
                />
              </div>

              <div className="space-y-2">
                {subtasks.map((st: any) => (
                  <div
                    key={st.id}
                    onClick={() => handleToggleSubtask(st.id)}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 cursor-pointer hover:border-blue-300 transition"
                  >
                    {st.completed ? (
                      <CheckSquare className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    ) : (
                      <Square className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    )}
                    <span className={`text-xs font-medium ${st.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
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
                  className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                <button type="submit" className="px-4 py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-800">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Timeline Comments */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Timeline & Discussion ({comments.length})
              </h3>

              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-5 rounded-3xl border ${
                    comment.is_internal_note
                      ? "bg-amber-50/90 border-amber-200 text-amber-900"
                      : "glass-panel text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">
                        {comment.author?.display_name || "System"}
                      </span>
                      {comment.is_internal_note && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-700" /> Internal Note (Agents Only)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                </div>
              ))}

              {/* Reply Box */}
              <form onSubmit={handlePostComment} className="glass-panel p-5 rounded-3xl space-y-4">
                <textarea
                  rows={4}
                  placeholder="Leave a comment or reply..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
                />

                <div className="flex items-center justify-between">
                  {isAgent ? (
                    <label className="flex items-center gap-2 text-xs font-bold text-amber-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded border-amber-300 text-amber-600 focus:ring-0"
                      />
                      <span className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Post as Internal Note (Hidden from employee)
                      </span>
                    </label>
                  ) : <div />}

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2"
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Status
                </label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value="open">🟢 Open</option>
                  <option value="in_progress">🟣 In Progress</option>
                  <option value="resolved">⚪ Resolved</option>
                  <option value="closed">⚪ Closed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Assignee
                </label>
                <select
                  value={ticket.assignee_id || ""}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
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
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reporter Info</h3>
              <div>
                <span className="font-bold text-sm text-slate-900 block">{ticket.author?.display_name}</span>
                <span className="text-xs font-medium text-slate-500 block mt-0.5">{ticket.author?.email}</span>
                <div className="mt-2 flex items-center gap-2">
                  {ticket.author?.user_type === "intern" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Intern (Supervisor: {ticket.author?.supervisor_name || "N/A"})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      Staff ({ticket.author?.department})
                    </span>
                  )}
                </div>
              </div>
            </GlassSurface>

            <GlassSurface className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-blue-600" /> Device Context
              </h3>
              {ticket.device_context ? (
                <div className="space-y-1.5 text-xs font-mono text-slate-600">
                  <p><strong className="text-slate-800">Screen:</strong> {ticket.device_context.screenResolution}</p>
                  <p className="truncate"><strong className="text-slate-800">Browser:</strong> {ticket.device_context.userAgent}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No device context attached.</p>
              )}
            </GlassSurface>
          </div>
        </div>
      </main>
    </div>
  );
}
