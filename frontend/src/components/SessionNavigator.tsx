"use client";

import clsx from "clsx";
import type { DebugSession } from "@/lib/debugStore";

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
      {sessions[activeSession] ? (
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Steps
          </h3>
          <ol className="mt-2 space-y-1">
            {sessions[activeSession].entries.map((entry, entryIndex) => (
              <li key={entryIndex}>
                <button
                  onClick={() => onSelectEntry(entryIndex)}
                  className={clsx(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition",
                    entryIndex === activeEntry
                      ? "bg-indigo-500 text-white shadow"
                      : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>Line {entry.line}</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">
                      {entry.content.length} vars
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </aside>
  );
}
