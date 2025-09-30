export interface GraphPayload {
  __type: "graph";
  adjacency: number[][];
  label?: string;
  rawId?: string;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isAdjacencyList(value: unknown): value is number[][] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.every((item) => typeof item === "number" && Number.isFinite(item))
    )
  );
}

export function isGraphPayload(value: unknown): value is GraphPayload {
  if (!isPlainObject(value)) {
    return false;
  }

  if (value.__type !== "graph") {
    return false;
  }

  if (!isAdjacencyList(value.adjacency)) {
    return false;
  }

  if (
    value.label !== undefined &&
    typeof value.label !== "string"
  ) {
    return false;
  }

  if (
    value.rawId !== undefined &&
    typeof value.rawId !== "string"
  ) {
    return false;
  }

  return true;
}
