import Link from "next/link";
import { EditorialGrid } from "@/components/EditorialGrid";
import { ArrowRight, Infinity } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white relative overflow-hidden flex flex-col justify-between p-8 md:p-16">
      <EditorialGrid />

      {/* Top Bar */}
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-zinc-900">
            <Infinity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Get Blue</span>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono text-zinc-400">
          <span>The Process</span>
          <span>The Difference</span>
          <Link href="/login" className="px-5 py-2 rounded-full bg-[#6a9bcc] hover:bg-[#5b8ab8] text-zinc-950 font-bold transition">
            Start Today
          </Link>
        </div>
      </header>

      {/* Main Editorial Hero */}
      <section className="relative z-10 my-auto py-16 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
        {/* Left Column: Floating AI Conversation Card */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-[#141416] border border-white/10 space-y-3 shadow-2xl max-w-md">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center text-[10px]">
                <Infinity className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-zinc-300">Blue Coach</span>
              <span className="text-[10px] font-mono text-zinc-500 ml-auto">2:13 PM</span>
            </div>
            <p className="text-xs font-mono text-zinc-300 leading-relaxed">
              Your data is now fully integrated. GTMSW AI Department has processed your system request.
            </p>
            <div className="text-[11px] font-mono bg-zinc-900/80 p-2.5 rounded-xl border border-white/5 text-zinc-400">
              Want me to log this to your schedule?
            </div>
          </div>
        </div>

        {/* Center & Right Column: Large Headlines & Step Counters */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-2.5 py-1 rounded border border-white/10 bg-zinc-900">
              PRESCRIBE
            </span>
            <span className="text-xs font-mono text-zinc-500">STEP 01</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-light tracking-tight text-white leading-tight">
            Responsive AI that turns your data into clear, personalized daily guidance.
          </h1>

          <p className="text-sm font-mono text-zinc-400 max-w-xl leading-relaxed">
            Receive an automated protocol built on evidence and tailored to your department. System-level recommendations grounded in live data.
          </p>

          <div className="pt-4 flex items-center gap-6">
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-full bg-[#6a9bcc] hover:bg-[#5b8ab8] text-zinc-950 font-bold text-sm transition flex items-center gap-2"
            >
              <span>Sign In to AI Desk</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/register" className="text-xs font-mono text-zinc-400 hover:text-white underline">
              Create Staff Account
            </Link>
          </div>
        </div>
      </section>

      {/* Editorial Footer */}
      <footer className="relative z-10 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-xs font-mono text-zinc-500 gap-4">
        <div className="flex items-center gap-6">
          <Link href="/login" className="hover:text-white">Home</Link>
          <Link href="/faq" className="hover:text-white">About Us</Link>
          <Link href="/faq" className="hover:text-white">Insights</Link>
          <Link href="/faq" className="hover:text-white">FAQs</Link>
        </div>

        <h2 className="text-2xl font-light text-white tracking-tight">
          Live better for longer
        </h2>

        <div>© 2026 GTMSW AI Department. All rights reserved.</div>
      </footer>
    </main>
  );
}
