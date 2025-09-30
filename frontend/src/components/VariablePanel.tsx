"use client";

import type { DebugEntry } from "@/lib/debugStore";
import { isAdjacencyList } from "@/lib/dataShapes";

interface VariablePanelProps {
  entry?: DebugEntry | null;
}

function isFlatArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.every((item) => !Array.isArray(item));
}

function renderScalar(value: unknown) {
  if (typeof value === "object") {
    return <code className="text-xs">{JSON.stringify(value, null, 2)}</code>;
  }
  return <span className="font-mono text-sm">{String(value)}</span>;
}

export function VariablePanel({ entry }: VariablePanelProps) {
  if (!entry) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white/60 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
        <p>No variables available for this step yet.</p>
        <p className="mt-1 text-xs">Call dbg(...) in your C++ code to stream variables here.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Variables at line {entry.line}
        </h3>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {entry.content.map(({ id, value }, index) => (
          <section
            key={`${id}-${index}`}
            className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80"
          >
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-semibold text-zinc-800 dark:text-zinc-100">
                {id}
              </h4>
              {isAdjacencyList(value) ? (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
                  Visualised as graph
                </span>
              ) : null}
            </div>
            {isAdjacencyList(value) ? (
              <pre className="overflow-x-auto text-xs text-zinc-700 dark:text-zinc-200">
                {JSON.stringify(value)}
              </pre>
            ) : isFlatArray(value) ? (
              <table className="w-full table-auto text-xs">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="px-2 py-1">Index</th>
                    <th className="px-2 py-1">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {value.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-zinc-200 dark:border-zinc-700"
                    >
                      <td className="px-2 py-1 font-mono text-zinc-600 dark:text-zinc-300">
                        {idx}
                      </td>
                      <td className="px-2 py-1 font-mono">
                        {typeof item === "object"
                          ? JSON.stringify(item)
                          : String(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              renderScalar(value)
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
