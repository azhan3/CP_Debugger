"use client";

import { useMemo } from "react";
import clsx from "clsx";
import type { DebugSession } from "@/lib/debugStore";
import { groupDebugEntries } from "@/lib/groupDebugEntries";

interface SessionNavigatorProps {
  sessions: DebugSession[];
  activeSession: number;
  activeEntry: number;
  onSelectSession: (sessionIndex: number) => void;
  onSelectEntry: (entryIndex: number) => void;
}

export function SessionNavigator({
  sessions,
  activeSession,
  activeEntry,
  onSelectSession,
  onSelectEntry,
}: SessionNavigatorProps) {
  const activeSessionData = sessions[activeSession];

  const stepGroups = useMemo(() => {
    if (!activeSessionData) {
      return [];
    }
    return groupDebugEntries(activeSessionData.entries);
  }, [activeSessionData]);

  return (
    <aside className="flex flex-col gap-4 h-full overflow-hidden">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Sessions
        </h2>
        <div className="mt-2 grid gap-2">
          {sessions.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Awaiting dbg payloads…
            </p>
          )}
          {sessions.map((session, index) => {
            const fileLabel = session.file
              ? session.file.replace(/\\/g, "/").split("/").pop()
              : null;
            return (
            <button
              key={index}
              onClick={() => onSelectSession(index)}
              className={clsx(
                "w-full rounded-md border px-3 py-2 text-left transition",
                index === activeSession
                  ? "border-indigo-500 bg-indigo-50 text-indigo-800 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-100"
                  : "border-zinc-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-400"
              )}
            >
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="truncate">
                  {fileLabel ?? `Session ${index + 1}`}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {session.entries.length} steps
                </span>
              </div>
            </button>
            );
          })}
        </div>
      </div>
      {activeSessionData ? (
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Steps
          </h3>
          <ol className="mt-2 space-y-2">
            {stepGroups.map((group, groupIndex) => {
              if (group.type === "single") {
                const isActive = group.entryIndex === activeEntry;
                return (
                  <li key={`single-${groupIndex}`}>
                    <button
                      onClick={() => onSelectEntry(group.entryIndex)}
                      className={clsx(
                        "w-full rounded-md px-3 py-2 text-left text-sm transition",
                        isActive
                          ? "bg-indigo-500 text-white shadow"
                          : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>Line {group.line}</span>
                        <span className="text-xs text-zinc-600 dark:text-zinc-300">
                          {group.entry.content.length} vars
                        </span>
                      </div>
                    </button>
                  </li>
                );
              }

              const loopStart = group.startIndex;
              const iterationCount = group.entries.length;
              const loopEnd = loopStart + iterationCount - 1;
              const isActive =
                activeEntry >= loopStart && activeEntry <= loopEnd;
              const activeIteration = isActive
                ? activeEntry - loopStart
                : 0;
              const iterationEntry = group.entries[activeIteration] ?? group.entries[0];
              const canStepBackward = isActive && activeIteration > 0;
              const canStepForward =
                isActive && activeIteration < iterationCount - 1;

              return (
                <li
                  key={`loop-${groupIndex}`}
                  className={clsx(
                    "rounded-lg border px-3 py-2 text-sm transition",
                    isActive
                      ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/50"
                      : "border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectEntry(loopStart)}
                      className="text-left font-semibold text-zinc-800 hover:underline focus:underline dark:text-zinc-100"
                    >
                      Line {group.line} loop
                    </button>
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">
                      {iterationCount} iterations
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                    <button
                      type="button"
                      onClick={() => onSelectEntry(activeEntry - 1)}
                      disabled={!canStepBackward}
                      className={clsx(
                        "rounded border px-2 py-1",
                        canStepBackward
                          ? "border-indigo-400 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
                          : "cursor-not-allowed border-zinc-300 text-zinc-400 dark:border-zinc-600 dark:text-zinc-500"
                      )}
                    >
                      Prev
                    </button>
                    <span>
                      Iteration {activeIteration + 1} of {iterationCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectEntry(activeEntry + 1)}
                      disabled={!canStepForward}
                      className={clsx(
                        "rounded border px-2 py-1",
                        canStepForward
                          ? "border-indigo-400 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
                          : "cursor-not-allowed border-zinc-300 text-zinc-400 dark:border-zinc-600 dark:text-zinc-500"
                      )}
                    >
                      Next
                    </button>
                    <span className="ml-auto text-xs">
                      {iterationEntry.content.length} vars
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {group.entries.map((_, iterationIndex) => {
                      const entryIndex = loopStart + iterationIndex;
                      const iterationActive = entryIndex === activeEntry;
                      return (
                        <button
                          key={entryIndex}
                          type="button"
                          onClick={() => onSelectEntry(entryIndex)}
                          className={clsx(
                            "rounded px-2 py-1 text-xs",
                            iterationActive
                              ? "bg-indigo-500 text-white shadow"
                              : "bg-white text-zinc-700 hover:bg-indigo-100 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-indigo-900/40"
                          )}
                        >
                          #{iterationIndex + 1}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </aside>
  );
}
