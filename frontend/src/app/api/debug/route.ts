import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  DebugSessionPayloadSchema,
  DebugSessionSchema,
  debugStore,
} from "@/lib/debugStore";

export async function GET() {
  return NextResponse.json({ sessions: debugStore.getSessions() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = DebugSessionPayloadSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid dbg payload", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const session = DebugSessionSchema.parse({
    ...result.data,
    id: randomUUID(),
  });

  debugStore.addSession(session);

  return NextResponse.json({ ok: true, id: session.id });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing session id" },
      { status: 400 }
    );
  }

  const removed = debugStore.removeSession(id);

  if (!removed) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
