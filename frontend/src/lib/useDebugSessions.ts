"use client";

import { useEffect, useMemo, useState } from "react";
import type { DebugEntry, DebugSession } from "@/lib/debugStore";

type StreamMessage =
  | { type: "init"; payload: DebugSession[] }
  | { type: "payload"; payload: DebugSession };

export function useDebugSessions() {
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [status, setStatus] = useState<"idle" | "connecting" | "open" | "error">("idle");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    setStatus("connecting");
    const source = new EventSource("/api/debug/stream");

    source.onopen = () => {
      setStatus("open");
    };

    source.onerror = () => {
      setStatus("error");
    };

    source.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as StreamMessage;
        if (message.type === "init") {
          setSessions(message.payload);
        } else if (message.type === "payload") {
          setSessions((prev) => [...prev, message.payload]);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error("Failed to parse stream message", error);
      }
    };

    return () => {
      source.close();
    };
  }, []);

  const latestSession = useMemo(() => {
    if (sessions.length === 0) return null;
    return sessions[sessions.length - 1];
  }, [sessions]);

  const latestEntries = latestSession?.entries ?? ([] as DebugEntry[]);

  return { sessions, status, lastUpdate, latestSession, latestEntries };
}
