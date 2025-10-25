import { NextResponse } from "next/server";
import { debugStore } from "@/lib/debugStore.server";

export async function GET() {
  return NextResponse.json({ counts: debugStore.getCounts() });
}
