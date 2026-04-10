export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

// n8n webhook endpoint
// Used for receiving data from n8n workflows (e.g., DB04 market date sync)
export async function POST(request: NextRequest) {
  try {
    // Verify bearer token
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.WEBHOOK_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as Record<string, any>;

    // Route based on webhook type
    const { type, data } = body;

    switch (type) {
      case "market-dates-sync":
        // Handle market dates sync from n8n
        // TODO: Store in cache or database
        console.log("Market dates synced:", data);
        break;

      case "order-complete":
        // Handle order completion notification from n8n
        // TODO: Update DB05/DB06
        console.log("Order completed:", data);
        break;

      default:
        console.log("Unknown webhook type:", type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
