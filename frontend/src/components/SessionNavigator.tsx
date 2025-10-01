"use client";

import { useMemo } from "react";
import clsx from "clsx";
import type { DebugSession } from "@/lib/debugStore";
import { groupDebugEntries, type StepGroup } from "@/lib/groupDebugEntries";

interface SessionNavigatorProps {
  sessions: DebugSession[];
  activeSession: number;
  activeEntry: number;
  onSelectSession: (sessionIndex: number) => void;
  onSelectEntry: (entryIndex: number) => void;
  onDeleteSession?: (sessionId: string) => void;
}

export function SessionNavigator({
  sessions,
  activeSession,
  activeEntry,
  onSelectSession,
  onSelectEntry,
  onDeleteSession,
}: SessionNavigatorProps) {
  const activeSessionData = sessions[activeSession];

  const stepGroups = useMemo(() => {
    if (!activeSessionData) {
      return [];
    }
    return groupDebugEntries(activeSessionData.entries);
  }, [activeSessionData]);

  const renderGroups = (groups: StepGroup[], depth = 0) => {
    if (!groups.length) {
      return null;
    }

    return (
      <ol
        className={clsx(
          "space-y-2",
          depth > 0 &&
            "mt-3 border-l border-zinc-200 pl-3 dark:border-zinc-700"
        )}
      >
        {groups.map((group, groupIndex) => {
          if (group.type === "single") {
            const isActive = group.entryIndex === activeEntry;
            return (
              <li key={`single-${depth}-${group.entryIndex}-${groupIndex}`}>
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

          const iterationCount = group.iterations.length;
          let activeIterationIndex = group.iterations.findIndex(
            (iteration) =>
              activeEntry >= iteration.range.start &&
              activeEntry < iteration.range.end
          );
          if (activeIterationIndex === -1) {
            activeIterationIndex = 0;
          }

          const activeIteration = group.iterations[activeIterationIndex];
          const fallbackIteration = group.iterations[0];
          const currentIteration = activeIteration ?? fallbackIteration;
          if (!currentIteration) {
            return null;
          }

          const iterationEntry = currentIteration.entry;
          const canStepBackward = activeIterationIndex > 0;
          const canStepForward = activeIterationIndex < iterationCount - 1;

          const goToIteration = (index: number) => {
            const target = group.iterations[index];
            if (target) {
              onSelectEntry(target.range.start);
            }
          };

          return (
            <li
              key={`loop-${depth}-${group.startIndex}-${groupIndex}`}
              className={clsx(
                "rounded-lg border px-3 py-2 text-sm transition",
                currentIteration &&
                  activeEntry >= currentIteration.range.start &&
                  activeEntry < currentIteration.range.end
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/50"
                  : "border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectEntry(currentIteration.range.start)}
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
                  onClick={() => goToIteration(activeIterationIndex - 1)}
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
                  Iteration {activeIterationIndex + 1} of {iterationCount}
                </span>
                <button
                  type="button"
                  onClick={() => goToIteration(activeIterationIndex + 1)}
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
                {group.iterations.map((iteration, iterationIndex) => {
                  const iterationActive =
                    activeEntry >= iteration.range.start &&
                    activeEntry < iteration.range.end;
                  return (
                    <button
                      key={`${iteration.entryIndex}-${iterationIndex}`}
                      type="button"
                      onClick={() => goToIteration(iterationIndex)}
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

              {currentIteration.groups.length > 0 ? (
                <div className="mt-3">
                  {renderGroups(currentIteration.groups, depth + 1)}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    );
  };

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
            const isActive = index === activeSession;
            return (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSession(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectSession(index);
                  }
                }}
                className={clsx(
                  "w-full rounded-md border px-3 py-2 text-left transition focus:outline-none focus-visible:ring focus-visible:ring-indigo-400/70",
                  isActive
                    ? "border-indigo-500 bg-indigo-50 text-indigo-800 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-100"
                    : "cursor-pointer border-zinc-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-400"
                )}
                aria-pressed={isActive}
              >
                <div className="flex items-center justify-between gap-2 text-sm font-medium">
                  <span className="truncate">
                    {fileLabel ?? `Session ${index + 1}`}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{session.entries.length} steps</span>
                    {onDeleteSession ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="rounded border border-transparent px-2 py-0.5 text-xs text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus-visible:ring focus-visible:ring-rose-400/70 dark:text-rose-300 dark:hover:bg-rose-900/40"
                        aria-label={`Delete session ${fileLabel ?? index + 1}`}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {activeSessionData ? (
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Steps
          </h3>
          <div className="mt-2">
            {renderGroups(stepGroups)}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
