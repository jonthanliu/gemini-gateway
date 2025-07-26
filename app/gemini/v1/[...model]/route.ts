import { isAuthenticated } from "@/lib/auth/auth";
import { proxyRequest } from "@/lib/proxy/gemini-proxy";
import { NextRequest } from "next/server";

async function handler(request: NextRequest) {
  const authError = await isAuthenticated(request);
  if (authError) {
    return authError;
  }
  return proxyRequest(request, "/gemini/");
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
