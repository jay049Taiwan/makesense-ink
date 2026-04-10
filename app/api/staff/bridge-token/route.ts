import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import crypto from "crypto";

// GET /api/staff/bridge-token — 產生 staff portal SSO bridge token
export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  if ((session as any).role !== "staff") {
    return NextResponse.json({ error: "非工作人員" }, { status: 403 });
  }

  const secret = process.env.MS_STAFF_BRIDGE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Bridge not configured" }, { status: 500 });
  }

  const email = session.user.email.toLowerCase().trim();
  const payload = JSON.stringify({
    email,
    exp: Math.floor(Date.now() / 1000) + 60,
  });

  const b64 = Buffer.from(payload).toString("base64");
  const sig = crypto.createHmac("sha256", secret).update(b64).digest("hex");
  const token = b64 + "." + sig;

  const bridgeUrl = `https://staff.makesense.site/api/auth/wp-bridge?token=${encodeURIComponent(token)}`;

  return NextResponse.json({ bridgeUrl });
}
