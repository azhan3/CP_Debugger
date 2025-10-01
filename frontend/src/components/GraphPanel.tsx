"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { select, type Selection } from "d3-selection";
import { drag, type D3DragEvent, type DragBehavior } from "d3-drag";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { zoom, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { Color } from "three";
import type { GraphPayload } from "@/lib/dataShapes";
import { isPlainObject } from "@/lib/dataShapes";

interface GraphPanelProps {
  graph: GraphPayload | null;
}

type GraphNode = SimulationNodeDatum & {
  id?: string | number;
  label?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  color?: string;
  [key: string]: unknown;
};
type GraphLink = SimulationLinkDatum<GraphNode> & {
  source: string | number | GraphNode;
  target: string | number | GraphNode;
  weight?: number;
};

interface NormalizedGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  weighted: boolean;
}

function getNodeKey(candidate: GraphNode | string | number | undefined): string {
  if (candidate === undefined) return "";
  if (typeof candidate === "string" || typeof candidate === "number") {
    return candidate.toString();
  }
  if (candidate.id !== undefined) {
    return String(candidate.id);
  }
  if (candidate.label !== undefined) {
    return String(candidate.label);
  }
  return "";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPairArray(value: unknown): value is [unknown, unknown] {
  return Array.isArray(value) && value.length >= 2;
}

function toNodeId(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  return JSON.stringify(value);
}

function ensureNode(map: Map<string, GraphNode>, id: string) {
  if (!map.has(id)) {
    map.set(id, { id, label: id });
  }
}

function normalizeArrayAdjacency(adjacency: unknown[]): NormalizedGraphData | null {
  if (!adjacency.every((item) => Array.isArray(item))) {
    return null;
  }

  const nodeMap = new Map<string, GraphNode>();
  adjacency.forEach((_, index) => {
    const nodeId = index.toString();
    ensureNode(nodeMap, nodeId);
  });

  const links: GraphLink[] = [];
  let weighted = false;

  adjacency.forEach((rawNeighbours, sourceIndex) => {
    const neighbours = rawNeighbours as unknown[];
    const sourceId = sourceIndex.toString();

    if (neighbours.every((item) => isNumber(item))) {
      neighbours.forEach((target) => {
        const targetId = target.toString();
        ensureNode(nodeMap, targetId);
        links.push({
          source: sourceId,
          target: targetId,
        });
      });
      return;
    }

    if (neighbours.every(isPairArray)) {
      neighbours.forEach((pair) => {
        const [targetCandidate, weightCandidate] = pair as unknown[];
        if (isNumber(targetCandidate) && isNumber(weightCandidate)) {
          const targetId = targetCandidate.toString();
          ensureNode(nodeMap, targetId);
          links.push({
            source: sourceId,
            target: targetId,
            weight: weightCandidate,
          });
          weighted = true;
        }
      });
      return;
    }

    // Mixed or unsupported structure within array adjacency
    weighted = weighted && neighbours.every(isPairArray);
  });

  if (!links.length && adjacency.length > 0) {
    // fallback to unweighted interpretation
    adjacency.forEach((rawNeighbours, sourceIndex) => {
      const neighbours = rawNeighbours as unknown[];
      neighbours.forEach((target) => {
        if (isNumber(target)) {
          const sourceId = sourceIndex.toString();
          const targetId = target.toString();
          ensureNode(nodeMap, targetId);
          links.push({
            source: sourceId,
            target: targetId,
          });
        }
      });
    });
    weighted = false;
  }

  return { nodes: Array.from(nodeMap.values()), links, weighted };
}

function normalizeMapAdjacency(adjacency: unknown[]): NormalizedGraphData | null {
  // Expect array of [key, neighbours]
  const nodeMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  let weighted = false;

  adjacency.forEach((entry) => {
    if (!Array.isArray(entry) || entry.length < 2) {
      return;
    }

    const key = toNodeId(entry[0]);
    ensureNode(nodeMap, key);

    const neighbours = entry[1];
    if (!Array.isArray(neighbours)) {
      return;
    }

    if (neighbours.every((item) => isNumber(item))) {
      neighbours.forEach((targetCandidate) => {
        const target = toNodeId(targetCandidate);
        ensureNode(nodeMap, target);
        links.push({ source: key, target });
      });
      return;
    }

    if (neighbours.every(isPairArray)) {
      weighted = true;
      neighbours.forEach((pair) => {
        const [targetCandidate, weightCandidate] = pair as unknown[];
        const target = toNodeId(targetCandidate);
        if (isNumber(weightCandidate)) {
          ensureNode(nodeMap, target);
          links.push({ source: key, target, weight: weightCandidate });
        }
      });
    }
  });

  return {
    nodes: Array.from(nodeMap.values()),
    links,
    weighted,
  };
}

function normalizeGraphPayload(payload: GraphPayload | null): NormalizedGraphData | null {
  if (!payload) return null;

  const { adjacency } = payload;

  if (Array.isArray(adjacency)) {
    const isMapLike = adjacency.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        !Array.isArray(entry[0]) &&
        (Array.isArray(entry[1]) || entry[1] === null || entry[1] === undefined)
    );

    if (isMapLike) {
      return normalizeMapAdjacency(adjacency);
    }

    const normalized = normalizeArrayAdjacency(adjacency);
    if (normalized) {
      return normalized;
    }

    // Fallback: treat as map adjacency (covers array of key/value pairs)
    return normalizeMapAdjacency(adjacency);
  }

  if (isPlainObject(adjacency)) {
    const entries = Object.entries(adjacency as Record<string, unknown>);
    return normalizeMapAdjacency(entries);
  }

  return null;
}

const GOLDEN_RATIO_CONJUGATE = 0.61803398875;

function hashString(candidate: unknown): number {
  const str = typeof candidate === "string" ? candidate : JSON.stringify(candidate ?? "");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33 + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function colorFromHueSeed(seed: number): string {
  const color = new Color();
  color.setHSL(seed % 1, 0.65, 0.55);
  return `#${color.getHexString()}`;
}

function generateUniqueColor(id: unknown, used: Set<string>): string {
  const baseSeed = hashString(id) / 0xffffffff;
  let attempt = 0;
  let color = colorFromHueSeed(baseSeed);

  while (used.has(color)) {
    const nextSeed = (baseSeed + GOLDEN_RATIO_CONJUGATE * (attempt + 1)) % 1;
    color = colorFromHueSeed(nextSeed);
    attempt += 1;
  }

  used.add(color);
  return color;
}

export function GraphPanel({ graph }: GraphPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const simulationRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);

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

  useEffect(() => {
    return () => {
      simulationRef.current?.stop();
      simulationRef.current = null;
    };
  }, []);

  const normalizedGraphData = useMemo(() => {
    const normalized = normalizeGraphPayload(graph ?? null);
    if (!normalized || normalized.nodes.length === 0) return null;
    return normalized;
  }, [graph]);

  const graphData = useMemo(() => {
    if (!normalizedGraphData) return null;

    const usedColors = new Set<string>();
    const nodes = normalizedGraphData.nodes.map((node, index) => {
      const uniqueColor = generateUniqueColor(node.id ?? node.label ?? index, usedColors);
      return {
        ...node,
        color: uniqueColor,
      } satisfies GraphNode;
    });

    return {
      ...normalizedGraphData,
      nodes,
    } satisfies NormalizedGraphData;
  }, [normalizedGraphData]);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) {
      return;
    }

  const svgSelection = select(svgElement);
  svgSelection.selectAll("*").remove();

    simulationRef.current?.stop();
    simulationRef.current = null;

    if (!graphData) {
      return;
    }

    const nodes: GraphNode[] = graphData.nodes.map((node) => ({
      ...node,
      x: node.x ?? dimensions.width / 2,
      y: node.y ?? dimensions.height / 2,
    }));

    const links: GraphLink[] = graphData.links.map((link) => ({ ...link }));

    const nodeById = new Map<string, GraphNode>(
      nodes.map((node) => [getNodeKey(node) || JSON.stringify(node.id ?? node.label ?? ""), node])
    );

    svgSelection
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
      .attr("style", "overflow: visible");

    const contentGroup = svgSelection.append("g");

    const linkGroup = contentGroup
      .append("g")
      .attr("stroke", "#c4b5fd")
      .attr("stroke-opacity", 0.6);

    const linkSelection = linkGroup
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (link: GraphLink) =>
        typeof link.weight === "number" ? Math.min(6, Math.max(1.5, link.weight / 2)) : 1.5
      );

    linkSelection
      .append("title")
      .text((link: GraphLink) =>
        typeof link.weight === "number"
          ? `weight: ${link.weight}`
          : `${getNodeKey(link.source)} → ${getNodeKey(link.target)}`
      );

    const labelGroup = contentGroup
      .append("g")
      .attr("pointer-events", "none")
      .attr("font-family", "Inter, 'Segoe UI', system-ui, sans-serif")
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .attr("fill", "#1f2937")
      .attr("stroke", "rgba(255,255,255,0.9)")
      .attr("stroke-width", 2)
      .attr("paint-order", "stroke");

    const nodeGroup = contentGroup
      .append("g")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.4);

    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, GraphNode>("g.node")
      .data(nodes, (node: GraphNode) => getNodeKey(node))
      .join((enter) => {
        const group = enter
          .append("g")
          .attr("class", "node")
          .attr("cursor", "grab") as Selection<SVGGElement, GraphNode, SVGGElement, unknown>;
        group
          .append("circle")
          .attr("r", 12)
          .attr("fill", (node: GraphNode) => node.color ?? "#6366f1")
          .attr("stroke", "rgba(15, 23, 42, 0.7)")
          .attr("stroke-width", 1.2);
        group
          .append("text")
          .attr("x", 16)
          .attr("dy", "0.35em")
          .attr("font-family", "Inter, 'Segoe UI', system-ui, sans-serif")
          .attr("font-size", 12)
          .attr("font-weight", 600)
          .attr("fill", "#0f172a")
          .attr("paint-order", "stroke")
          .attr("stroke", "rgba(255,255,255,0.85)")
          .attr("stroke-width", 2)
          .text((node: GraphNode) => node.label ?? String(node.id ?? ""));
        return group;
      });

    const getPoint = (
      value: GraphLink["source" | "target"]
    ): { x: number; y: number } | undefined => {
      if (value === undefined || value === null) {
        return undefined;
      }
      const resolved = typeof value === "object" ? value : nodeById.get(String(value));
      if (!resolved) return undefined;
      const maybeNode = resolved as GraphNode;
      const x = maybeNode.x ?? (resolved as { x?: number }).x ?? 0;
      const y = maybeNode.y ?? (resolved as { y?: number }).y ?? 0;
      return { x, y };
    };

    const weightedLinks = links.filter((link) => typeof link.weight === "number");

    const labelSelection = labelGroup
      .selectAll<SVGTextElement, GraphLink>("text.edge-label")
      .data(weightedLinks, (link: GraphLink) => `${getNodeKey(link.source)}→${getNodeKey(link.target)}`)
      .join((enter) =>
        enter
          .append("text")
          .attr("class", "edge-label")
          .attr("text-anchor", "middle")
          .text((link) => (typeof link.weight === "number" ? String(link.weight) : ""))
      );

    const updatePositions = () => {
      linkSelection
        .attr("x1", (link: GraphLink) => getPoint(link.source)?.x ?? 0)
        .attr("y1", (link: GraphLink) => getPoint(link.source)?.y ?? 0)
        .attr("x2", (link: GraphLink) => getPoint(link.target)?.x ?? 0)
        .attr("y2", (link: GraphLink) => getPoint(link.target)?.y ?? 0);

      nodeSelection.attr(
        "transform",
        (node: GraphNode) =>
          `translate(${node.x ?? dimensions.width / 2}, ${node.y ?? dimensions.height / 2})`
      );

      labelSelection
        .attr("x", (link) => {
          const source = getPoint(link.source);
          const target = getPoint(link.target);
          if (!source || !target) return 0;
          return (source.x + target.x) / 2;
        })
        .attr("y", (link) => {
          const source = getPoint(link.source);
          const target = getPoint(link.target);
          if (!source || !target) return 0;
          return (source.y + target.y) / 2 - 8;
        })
        .attr("dy", "0.35em");
    };

    const simulation = forceSimulation<GraphNode, GraphLink>(nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links)
          .id((node) => getNodeKey(node) || JSON.stringify(node.id ?? node.label ?? ""))
          .distance(() => (graphData.weighted ? 110 : 80))
          .strength(0.6)
      )
      .force("charge", forceManyBody<GraphNode>().strength(-260))
      .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collision", forceCollide<GraphNode>().radius(26).strength(0.9))
      .on("tick", updatePositions);

    updatePositions();

    const dragBehaviour: DragBehavior<SVGGElement, GraphNode, SVGSVGElement> = drag<
      SVGGElement,
      GraphNode,
      SVGSVGElement
    >()
      .on("start", (event: D3DragEvent<SVGGElement, GraphNode, SVGSVGElement>, node: GraphNode) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        node.fx = node.x;
        node.fy = node.y;
      })
      .on("drag", (event: D3DragEvent<SVGGElement, GraphNode, SVGSVGElement>, node: GraphNode) => {
        node.fx = event.x;
        node.fy = event.y;
      })
      .on("end", (event: D3DragEvent<SVGGElement, GraphNode, SVGSVGElement>, node: GraphNode) => {
        if (!event.active) simulation.alphaTarget(0);
        node.fx = undefined;
        node.fy = undefined;
      });

    nodeSelection.call(dragBehaviour as unknown as (selection: typeof nodeSelection) => void);

    const zoomBehaviour: ZoomBehavior<SVGSVGElement, unknown> = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 4])
      .filter((event: MouseEvent | WheelEvent | TouchEvent) => {
        if (event.type === "wheel") return true;
        if (event instanceof MouseEvent) {
          if (event.type === "mousedown") {
            return event.button === 0 || event.button === 2;
          }
          return !event.ctrlKey;
        }
        return true;
      })
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const transform = event.transform as ZoomTransform;
        contentGroup.attr("transform", transform.toString());
      });

    svgSelection
      .call(zoomBehaviour)
      .on("dblclick.zoom", null)
      .on("contextmenu", (event) => event.preventDefault());

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [graphData, dimensions]);

  if (!graphData) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white/60 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
        <p>No graph-like structure detected in the current step.</p>
        <p className="mt-1 text-xs">Wrap your adjacency list with graph(...) inside dbg to visualise it here.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    >
      {graph?.label ? (
        <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 shadow-sm backdrop-blur dark:text-indigo-200">
          {graph.label}
        </div>
      ) : null}
      <svg ref={svgRef} className="h-full w-full bg-transparent" />
    </div>
  );
}
