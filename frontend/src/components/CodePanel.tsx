"use client";

import { useEffect, useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const DEFAULT_CODE = `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> build_graph(int n, const vector<pair<int, int>>& edges) {
    vector<vector<int>> adj(n);
    for (auto [u, v] : edges) {
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    return adj;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    vector<pair<int, int>> edges(m);
    for (auto& [u, v] : edges) {
        cin >> u >> v;
        --u; --v;
    }

    auto adj = build_graph(n, edges);
    // dbg(adj);

    return 0;
}`;

interface CodePanelProps {
  activeLine?: number | null;
  sourceCode?: string | null;
}

export function CodePanel({ activeLine, sourceCode }: CodePanelProps) {
  const [code, setCode] = useState(sourceCode ?? DEFAULT_CODE);

  useEffect(() => {
    if (typeof sourceCode === "string" && sourceCode.length > 0) {
      setCode(sourceCode);
    }
  }, [sourceCode]);

  const lineCount = useMemo(() => code.split("\n").length, [code]);

  return (
    // NOTE: no h-full, no overflow-hidden here
    <div className="flex flex-col rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
        <div>
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">Code viewer</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Paste your source code below to highlight dbg hits. Line count: {lineCount}
          </p>
        </div>
        {activeLine ? (
          <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
            Current line: {activeLine}
          </span>
        ) : null}
      </header>

      {/* Body: natural height (no grid, no overflow). Page will extend downward. */}
      <div>
        <SyntaxHighlighter
          language="cpp"
          style={oneDark}
          showLineNumbers
          wrapLongLines
          customStyle={{
            margin: 0,
            padding: "1rem",
            // IMPORTANT: remove minHeight: "100%" so it doesn't force a fixed box
            // display left default (block) is fine
          }}
          lineNumberStyle={{ color: "#7f848e" }}
          wrapLines
          lineProps={(lineNumber: number) => {
            if (activeLine && lineNumber === activeLine) {
              return {
                style: {
                  backgroundColor: "rgba(99, 102, 241, 0.2)",
                  display: "block",
                  margin: "0 -1rem",
                  padding: "0 1rem",
                },
              };
            }
            return {};
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
