import { NextRequest, NextResponse } from "next/server";
import { DebugSessionSchema, debugStore } from "@/lib/debugStore";

export async function GET() {
  return NextResponse.json({ sessions: debugStore.getSessions() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = DebugSessionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid dbg payload", details: result.error.flatten() },
      { status: 400 }
    );
  }

  debugStore.addSession(result.data);

  return NextResponse.json({ ok: true });
}
