import { checkAndResetKeyStatus } from "@/lib/services/key.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await checkAndResetKeyStatus();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
