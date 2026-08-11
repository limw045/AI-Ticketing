import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const access = await requireApiUser({ agentOnly: true });
    if ("error" in access) return access.error;
    const { category } = await req.json();

    let draftReply = "Hi! Thank you for reporting this automation request. Our internal support team is reviewing it.";

    if (category === "Risk Screen") {
      draftReply = "Hi! Your automation risk screen has been received. We are reviewing the business context, systems, data types, and approval requirements provided in the ticket.";
    } else if (category === "Common Problem") {
      draftReply = "Hi! We are investigating the reported automation problem. We will use the reproduction details, screenshot, or sanitized TXT log attached to trace the issue.";
    }

    return NextResponse.json({ draftReply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Draft reply error" }, { status: 500 });
  }
}
