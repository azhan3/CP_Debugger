import type { DebugEntry } from "@/lib/debugStore";

export type StepGroup =
  | {
      type: "single";
      line: number;
      entryIndex: number;
      entry: DebugEntry;
    }
  | {
      type: "loop";
      line: number;
      startIndex: number;
      entries: DebugEntry[];
      file?: string;
    };

export function groupDebugEntries(entries: DebugEntry[]): StepGroup[] {
  const groups: StepGroup[] = [];

  let index = 0;
  while (index < entries.length) {
    const startIndex = index;
    const entry = entries[index];
    const { line, file } = entry;

    index += 1;
    while (
      index < entries.length &&
      entries[index].line === line &&
      entries[index].file === file
    ) {
      index += 1;
    }

    const count = index - startIndex;

    if (count === 1) {
      groups.push({
        type: "single",
        line,
        entryIndex: startIndex,
        entry,
      });
    } else {
      groups.push({
        type: "loop",
        line,
        startIndex,
        file,
        entries: entries.slice(startIndex, index),
      });
    }
  }

  return groups;
}
