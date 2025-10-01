"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDebugSessions } from "@/lib/useDebugSessions";
import type { DebugEntry } from "@/lib/debugStore";
import { isGraphPayload, type GraphPayload } from "@/lib/dataShapes";
import { SessionNavigator } from "@/components/SessionNavigator";
import { GraphPanel } from "@/components/GraphPanel";
import { VariablePanel } from "@/components/VariablePanel";
import { CodePanel } from "@/components/CodePanel";

export default function Home() {
  const { sessions, status, lastUpdate, latestSession, latestEntries } =
    useDebugSessions();
  const [selectedSession, setSelectedSession] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState(0);
  const [selectedGraph, setSelectedGraph] = useState<
    { id: string; payload: GraphPayload } | null
  >(null);
  const lastSessionCount = useRef(0);
  const lastStepCount = useRef(0);

  useEffect(() => {
    if (sessions.length === 0) {
      if (selectedSession !== 0) {
        setSelectedSession(0);
      }
      if (selectedEntry !== 0) {
        setSelectedEntry(0);
      }
      return;
    }

    const clampedSession = Math.min(selectedSession, sessions.length - 1);
    if (clampedSession !== selectedSession) {
      setSelectedSession(clampedSession);
      setSelectedEntry(0);
      return;
    }

    const currentEntries = sessions[clampedSession]?.entries ?? [];
    const clampedEntry = Math.min(
      selectedEntry,
      Math.max(0, currentEntries.length - 1)
    );

    if (clampedEntry !== selectedEntry) {
      setSelectedEntry(clampedEntry);
    }
  }, [sessions, selectedSession, selectedEntry]);

  useEffect(() => {
    if (sessions.length === 0) {
      lastSessionCount.current = 0;
      lastStepCount.current = 0;
      return;
    }

    const latestIndex = sessions.length - 1;
    const latestSteps = sessions[latestIndex].entries;
    const isNewSession = sessions.length !== lastSessionCount.current;
    const isNewStep = latestSteps.length !== lastStepCount.current;

    if (isNewSession || (isNewStep && selectedSession === latestIndex)) {
      setSelectedSession(latestIndex);
      if (latestSteps.length > 0) {
        setSelectedEntry(latestSteps.length - 1);
      }
    }

    lastSessionCount.current = sessions.length;
    lastStepCount.current = latestSteps.length;
  }, [sessions, selectedSession]);

  const activeEntry: DebugEntry | undefined = useMemo(() => {
    return sessions[selectedSession]?.entries[selectedEntry];
  }, [sessions, selectedEntry, selectedSession]);

  useEffect(() => {
    if (!activeEntry) {
      setSelectedGraph(null);
      return;
    }

    const graphVars = activeEntry.content.filter(
      (item): item is { id: string; value: GraphPayload } =>
        isGraphPayload(item.value)
    );

    setSelectedGraph((previous) => {
      if (previous) {
        const match = graphVars.find(({ id }) => id === previous.id);
        if (match) {
          return { id: match.id, payload: match.value };
        }
      }

      if (graphVars.length > 0) {
        const first = graphVars[0];
        return { id: first.id, payload: first.value };
      }

      return null;
    });
  }, [activeEntry]);

      const handleDeleteSession = async (sessionId: string) => {
        try {
          const response = await fetch(`/api/debug?id=${sessionId}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            const errorBody = await response.text();
            console.error("Failed to delete session", errorBody);
          }
        } catch (error) {
          console.error("Failed to delete session", error);
        }
      };

  return (
    <div className="min-h-screen bg-slate-950/5 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6">
        <header className="flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                CP Debugger Visualizer
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Stream dbg payloads from your C++ programs and inspect graphs,
                arrays, and scalars in real time.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <StatusPill status={status} />
              {lastUpdate ? (
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </span>
              ) : null}
              {latestEntries.length ? (
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
                  {latestEntries.length} captured steps in latest run
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <main className="grid min-h-[70vh] grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <SessionNavigator
            sessions={sessions}
            activeSession={selectedSession}
            activeEntry={selectedEntry}
            onSelectSession={(index) => {
              setSelectedSession(index);
              setSelectedEntry(0);
            }}
            onSelectEntry={(index) => setSelectedEntry(index)}
            onDeleteSession={handleDeleteSession}
          />
          <section className="grid grid-rows-[minmax(280px,1fr)_minmax(200px,0.9fr)] gap-6 lg:grid-cols-[minmax(340px,1.1fr)_minmax(320px,0.9fr)] lg:grid-rows-1">
            <GraphPanel graph={selectedGraph?.payload ?? null} />
            <VariablePanel
              entry={activeEntry}
              selectedGraphId={selectedGraph?.id ?? null}
              onSelectGraph={(id, payload) =>
                setSelectedGraph({ id, payload })
              }
            />
            <div className="lg:col-span-2">
              <CodePanel
                activeLine={activeEntry?.line}
                sourceCode={sessions[selectedSession]?.code ?? latestSession?.code ?? null}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: "idle" | "connecting" | "open" | "error";
}) {
  const config: Record<typeof status, { label: string; className: string }> = {
    idle: {
      label: "Idle",
      className:
        "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    },
    connecting: {
      label: "Connecting…",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
    },
    open: {
      label: "Live stream",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
    },
    error: {
      label: "Disconnected",
      className:
        "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200",
    },
  };

  const { label, className } = config[status];

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
