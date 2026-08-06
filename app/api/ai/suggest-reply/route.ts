import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { category, title, description } = await req.json();

    let draftReply = "Hi! Thank you for reporting this issue. Our IT support team is investigating.";

    if (category === "VPN & Network") {
      draftReply = "Hi! Please try clearing your browser DNS cache and re-authenticating with your GlobalProtect VPN credentials. Let us know if the issue persists.";
    } else if (category === "Hardware") {
      draftReply = "Hi! Please bring your device to IT Support Office (Level 3) for diagnostic check or hardware replacement.";
    } else if (category === "Permissions") {
      draftReply = "Hi! Your access permission request has been submitted for Manager approval. Once approved, access will be provisioned automatically.";
    }

    return NextResponse.json({ draftReply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Draft reply error" }, { status: 500 });
  }
}
