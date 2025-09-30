"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

const ForceGraph2D = dynamic(async () => (await import("react-force-graph-2d")).default, {
  ssr: false,
});

interface GraphPanelProps {
  adjacency?: number[][] | null;
}

type GraphNode = { id: string };
type GraphLink = { source: string; target: string };

function buildGraph(adjacency: number[][]) {
  const nodes: GraphNode[] = adjacency.map((_, index) => ({ id: index.toString() }));
  const links: GraphLink[] = [];

  adjacency.forEach((neighbours, source) => {
    neighbours.forEach((target) => {
      links.push({ source: source.toString(), target: target.toString() });
    });
  });

  return { nodes, links };
}

export function GraphPanel({ adjacency }: GraphPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 320),
          height: Math.max(height, 240),
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    if (!adjacency || adjacency.length === 0) return null;
    return buildGraph(adjacency);
  }, [adjacency]);

  if (!graphData) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white/60 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
        <p>No graph-like structure detected in the current step.</p>
        <p className="mt-1 text-xs">Emit an adjacency list (vector&lt;vector&lt;int&gt;&gt;) through dbg to visualise it here.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    >
      <ForceGraph2D
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeAutoColorBy="id"
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={2}
        cooldownTicks={100}
        backgroundColor="transparent"
      />
    </div>
  );
}
