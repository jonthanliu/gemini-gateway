import { checkAndReactivateKeys } from "@/lib/services/key.service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await checkAndReactivateKeys();
    return NextResponse.json({
      status: "ok",
      message: "Key health check completed.",
    });
  } catch (error: unknown) {
    console.error("[Cron Health Check Error]", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        status: "error",
        message: "Key health check failed.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
