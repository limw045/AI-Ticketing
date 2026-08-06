import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-blue-50/60 via-slate-50 to-indigo-50/40">
      <div className="bg-white/90 backdrop-blur-md p-10 rounded-3xl max-w-xl w-full space-y-6 shadow-2xl border border-slate-200/80">
        <div className="flex justify-center gap-2 mb-2">
          <div className="w-3.5 h-3.5 rounded-full bg-rose-400" />
          <div className="w-3.5 h-3.5 rounded-full bg-amber-400" />
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-400" />
        </div>
        
        <span className="px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider inline-block">
          GTMSW Internal Portal
        </span>

        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Staff & Intern Support
        </h1>
        
        <p className="text-slate-600 text-sm leading-relaxed">
          Welcome! Submit IT tickets, check real-time resolution status, and access the Q&A knowledge base for Full-time Staff (`@gtmsw.com.my`) and Interns (`@outlook.com`).
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold transition text-white shadow-lg shadow-blue-500/25 text-sm"
          >
            Sign In
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
