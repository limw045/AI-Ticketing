import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing API Key" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, category = "System Bug", priority = "medium", user_email, system_logs } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "Missing required fields: title, description" }, { status: 400 });
    }

    // Payload Sanitization: Truncate system logs to 50KB max
    let sanitizedLogs = system_logs;
    if (typeof system_logs === "string" && system_logs.length > 50000) {
      sanitizedLogs = system_logs.substring(0, 50000) + "\n...[Truncated logs over 50KB]";
    } else if (typeof system_logs === "object" && JSON.stringify(system_logs).length > 50000) {
      sanitizedLogs = { _truncated: true, preview: JSON.stringify(system_logs).substring(0, 50000) };
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy_key"
    );

    // Look up profile by user_email
    let authorId = null;
    if (user_email) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", user_email.toLowerCase())
        .single();
      if (profile) authorId = profile.id;
    }

    const { data: ticket, error: insertError } = await supabaseAdmin
      .from("tickets")
      .insert({
        title,
        description,
        category,
        priority,
        author_id: authorId,
        system_logs: sanitizedLogs,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Ticket created successfully from API log ingestion",
        ticket: {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          title: ticket.title,
          status: ticket.status,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
