import Link from "next/link";
import { BlurText } from "@/components/react-bits/BlurText";
import { ShinyText } from "@/components/react-bits/ShinyText";
import { GlassSurface } from "@/components/react-bits/GlassSurface";
import { ArrowRight, Ticket, UserPlus } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" style={{ animationDelay: "3s" }} />

      <div className="w-full max-w-2xl relative z-10 text-center">
        <GlassSurface showWindowDots title="GTMSW Portal" className="p-8 sm:p-12 space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-300 mx-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Official Support Channel</span>
            <span className="text-zinc-600">•</span>
            <ShinyText text="Enterprise Ready" className="font-semibold text-blue-400" />
          </div>

          <div className="space-y-3">
            <BlurText
              text="Internal Support Portal"
              className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent justify-center"
              animateBy="words"
            />
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
              Communication & Ticketing platform for GTMSW Staff (<code className="text-blue-300 bg-blue-950/50 px-1.5 py-0.5 rounded font-mono text-xs">@gtmsw.com.my</code>) and Interns (<code className="text-amber-300 bg-amber-950/50 px-1.5 py-0.5 rounded font-mono text-xs">@outlook.com</code>).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
            >
              <Ticket className="w-4 h-4" />
              <span>Sign In to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-zinc-400" />
              <span>Register Account</span>
            </Link>
          </div>

        </GlassSurface>
      </div>
    </main>
  );
}
