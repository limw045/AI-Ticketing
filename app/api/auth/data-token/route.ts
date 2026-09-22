import { NextRequest, NextResponse } from "next/server";
import { getDataToken } from "@/lib/supabase/data-token";
import { TokenExchangeError } from "@/lib/supabase/exchange-token";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ") || authorization.length > 16384) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const result = await getDataToken(authorization.slice(7));
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof TokenExchangeError ? error.message : "Unable to verify this session." },
      { status: error instanceof TokenExchangeError ? error.status : 502, headers: { "Cache-Control": "no-store" } });
  }
}
