"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDebugSessions } from "@/lib/useDebugSessions";
import type { DebugEntry } from "@/lib/debugStore";
import { isGraphPayload, type GraphPayload } from "@/lib/dataShapes";
import { SessionNavigator } from "@/components/SessionNavigator";
import { GraphPanel } from "@/components/GraphPanel";
import { VariablePanel } from "@/components/VariablePanel";
import { CodePanel } from "@/components/CodePanel";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

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
    <div className="min-h-screen bg-slate-950/5">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
        <main className="min-h-[600px]">
          <PanelGroup direction="horizontal" className="min-h-[600px]">
            {/* Session Navigator - Left Sidebar */}
            <Panel defaultSize={20} minSize={15} maxSize={35}>
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
            </Panel>

            <PanelResizeHandle className="mx-3 w-1 bg-slate-300/50 hover:bg-blue-500/70 active:bg-blue-600 transition-colors rounded-full" />

            {/* Main Content Area: Graph + Variables (resizable) */}
            <Panel defaultSize={80} minSize={50}>
              <PanelGroup direction="vertical">
                {/* Top Row: Graph and Variables */}
                <Panel defaultSize={100} minSize={30}>
                  <PanelGroup direction="horizontal">
                    <Panel defaultSize={55} minSize={30}>
                      <GraphPanel graph={selectedGraph?.payload ?? null} />
                    </Panel>

                    <PanelResizeHandle className="mx-3 w-1 bg-slate-300/50 hover:bg-blue-500/70 active:bg-blue-600 transition-colors rounded-full" />

                    <Panel defaultSize={45} minSize={25}>
                      <VariablePanel
                        entry={activeEntry}
                        selectedGraphId={selectedGraph?.id ?? null}
                        onSelectGraph={(id, payload) =>
                          setSelectedGraph({ id, payload })
                        }
                      />
                    </Panel>
                  </PanelGroup>
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>

          {/* Code viewer (outside of resizable panels so it can expand with page) */}
          <div className="mt-4">
            <CodePanel
              activeLine={activeEntry?.line}
              sourceCode={sessions[selectedSession]?.code ?? latestSession?.code ?? null}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
