import Link from "next/link";
import { Cpu, Sparkles } from "lucide-react";
import { DotGridBg } from "@/components/react-bits/DotGridBg";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-blue-50/70 via-slate-50 to-indigo-50/50 relative overflow-hidden">
      <DotGridBg />

      <div className="bg-white/95 backdrop-blur-xl p-10 rounded-3xl max-w-xl w-full space-y-6 shadow-2xl border border-slate-200/90 relative z-10">
        <div className="flex justify-center gap-2 mb-2">
          <div className="w-3.5 h-3.5 rounded-full bg-rose-400" />
          <div className="w-3.5 h-3.5 rounded-full bg-amber-400" />
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-400" />
        </div>
        
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold uppercase tracking-wider">
          <Cpu className="w-4 h-4 text-blue-600 animate-pulse" /> GTMSW AI Department Desk
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          AI Department Support
        </h1>
        
        <p className="text-slate-600 text-sm leading-relaxed font-medium">
          Integrated communication and ticketing platform for other departments to submit AI model support, GPU cluster access, data pipeline requests, and AI system bugs.
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold transition text-white shadow-lg shadow-blue-500/25 text-sm"
          >
            Sign In to AI Desk
          </Link>
          <Link
            href="/register"
            className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 font-bold transition text-slate-700 border border-slate-200 text-sm"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
