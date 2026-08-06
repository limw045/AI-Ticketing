import Link from "next/link";
import { Cpu, ArrowRight } from "lucide-react";
import { DotGridBg } from "@/components/react-bits/DotGridBg";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-[#fcfcfc] relative overflow-hidden">
      <DotGridBg />

      <div className="bg-white p-10 rounded-2xl max-w-md w-full space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-black/5 relative z-10 text-left">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-sm">
            <Cpu className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-mono font-medium text-zinc-400 border border-black/5 px-2 py-0.5 rounded bg-zinc-50">
            v1.0 • AI Support
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            GTMSW AI Dept Support
          </h1>
          <p className="text-zinc-500 text-xs leading-relaxed mt-1">
            Official internal portal for submitting AI model support, GPU cluster access, data pipeline requests, and AI system tickets.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Link
            href="/login"
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold transition text-white shadow-sm text-xs flex items-center justify-center gap-2"
          >
            <span>Sign In to AI Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/register"
            className="w-full py-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 font-semibold transition text-zinc-700 border border-black/5 text-xs flex items-center justify-center"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
