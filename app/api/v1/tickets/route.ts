import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { sanitizeSystemLogs } from "@/lib/api-ingestion";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.length <= 7) {
      return NextResponse.json({ error: "Unauthorized: Missing API Key" }, { status: 401 });
    }
    const apiKey = authHeader.slice(7).trim();
    const idempotencyKey = req.headers.get("idempotency-key")?.trim() || null;

    const body = await req.json();
    const { title, description, category, priority = "medium", user_email, system_logs } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "Missing required fields: title, description" }, { status: 400 });
    }

    const sanitizedLogs = sanitizeSystemLogs(system_logs);

    const { url, anonKey } = getSupabasePublicConfig();
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: ticket, error: insertError } = await supabase.rpc("ingest_ticket", {
      p_api_key: apiKey,
      p_ticket_title: title,
      p_ticket_description: description,
      p_ticket_category: typeof category === "string" ? category : null,
      p_ticket_priority: priority,
      p_user_email: typeof user_email === "string" ? user_email : null,
      p_system_logs: sanitizedLogs ?? null,
      p_idempotency_key: idempotencyKey,
    });

    if (insertError) {
      const message = insertError.message || "Ticket ingestion failed";
      const status = message.includes("Invalid API key")
        ? 401
        : message.includes("rate limit")
          ? 429
          : 400;
      return NextResponse.json({ error: message }, { status });
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
