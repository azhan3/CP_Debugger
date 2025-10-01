"use client";

import { useEffect, useMemo, useState } from "react";
import type { DebugEntry, DebugSession } from "@/lib/debugStore";

type StreamMessage =
  | { type: "init"; payload: DebugSession[] }
  | { type: "add"; payload: DebugSession }
  | { type: "delete"; id: string };

export function useDebugSessions() {
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [status, setStatus] = useState<"idle" | "connecting" | "open" | "error">("idle");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialSessions() {
      try {
        const response = await fetch("/api/debug", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to fetch sessions: ${response.status}`);
        }
        const data = (await response.json()) as { sessions?: DebugSession[] };
        if (!cancelled && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
        }
      } catch (error) {
        console.error("Failed to load initial sessions", error);
      }
    }

    loadInitialSessions();

    return () => {
      cancelled = true;
    };
  }, []);

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
        } else if (message.type === "add") {
          setSessions((prev) => {
            const existingIndex = prev.findIndex(
              (session) => session.id === message.payload.id
            );
            if (existingIndex >= 0) {
              const next = [...prev];
              next[existingIndex] = message.payload;
              return next;
            }
            return [...prev, message.payload];
          });
          setLastUpdate(new Date());
        } else if (message.type === "delete") {
          setSessions((prev) =>
            prev.filter((session) => session.id !== message.id)
          );
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
