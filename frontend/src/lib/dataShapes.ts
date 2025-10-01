export interface GraphPayload {
  __type: "graph";
  adjacency: unknown;
  label?: string;
  rawId?: string;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isGraphPayload(value: unknown): value is GraphPayload {
  if (!isPlainObject(value)) {
    return false;
  }

  if (value.__type !== "graph") {
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
