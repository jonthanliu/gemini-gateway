// lib/adapters/gemini-to-gemini.ts
import { geminiClient } from "@/lib/core/gemini-client";
import { NextRequest, NextResponse } from "next/server";

export async function geminiPassthroughAdapter(request: NextRequest, model: string) {
  const requestBody = await request.json();
  const isStream = request.url.includes("streamGenerateContent");

  const geminiResponse = await geminiClient.generateContent(
    model,
    requestBody,
    isStream
  );

  if (!geminiResponse.ok) {
    return new NextResponse(geminiResponse.body, { status: geminiResponse.status });
  }

  return new NextResponse(geminiResponse.body, {
    status: 200,
    headers: {
      "Content-Type": geminiResponse.headers.get("Content-Type") || "application/json",
    },
  });
}
