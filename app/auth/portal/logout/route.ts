import { NextResponse, type NextRequest } from "next/server";
import { clearOAuthCookies } from "@/lib/auth/portal-session";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const response = NextResponse.json({ ok: true });
  clearOAuthCookies(response, request);
  return response;
}
