export function getTicketAttachmentBucket() {
  return process.env.NEXT_PUBLIC_TICKET_ATTACHMENT_BUCKET || "ticket-attachments";
}

export function getSupabaseSchema() {
  return process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "public";
}

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Configure them in the deployment environment."
    );
  }

  return { url, anonKey, schema: getSupabaseSchema() };
}

export function getSupabaseAuthConfig() {
  const data = getSupabasePublicConfig();
  const url = process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL || data.url;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY || data.anonKey;
  if (url !== data.url && !process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY) {
    throw new Error("A separate Auth project requires NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY.");
  }
  return { url, anonKey };
}
