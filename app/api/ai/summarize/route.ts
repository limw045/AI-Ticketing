import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const access = await requireApiUser({ agentOnly: true });
    if ("error" in access) return access.error;
    const { title, description } = await req.json();

    if (!title || !description) {
      return NextResponse.json({ error: "Missing title or description" }, { status: 400 });
    }

    // Heuristic AI summary fallback for fast offline/local performance
    const cleanDesc = description.replace(/#+\s/g, "").replace(/\n/g, " ");
    const summary = `AI Summary: ${title} — ${cleanDesc.substring(0, 120)}...`;

    return NextResponse.json({ summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Summarization error" }, { status: 500 });
  }
}
