import type { DebugEntry } from "@/lib/debugStore";

export type LoopIteration = {
  entryIndex: number;
  entry: DebugEntry;
  range: { start: number; end: number };
  groups: StepGroup[];
};

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
      iterations: LoopIteration[];
      file?: string;
    };

function compareBlocks(
  entries: DebugEntry[],
  aStart: number,
  bStart: number,
  length: number
): boolean {
  for (let offset = 0; offset < length; offset += 1) {
    const a = entries[aStart + offset];
    const b = entries[bStart + offset];
    if (!a || !b) {
      return false;
    }
    if (a.line !== b.line || a.file !== b.file) {
      return false;
    }
  }
  return true;
}

function detectLoop(
  entries: DebugEntry[],
  start: number
): { blockLength: number; iterationCount: number } | null {
  const base = entries[start];
  if (!base) return null;

  for (let offset = start + 1; offset < entries.length; offset += 1) {
    const candidate = entries[offset];
    if (!candidate) {
      break;
    }

    const sameLocation =
      candidate.line === base.line && candidate.file === base.file;
    if (!sameLocation) {
      continue;
    }

    const blockLength = offset - start;
    if (blockLength === 0) {
      continue;
    }

    if (!compareBlocks(entries, start, offset, blockLength)) {
      continue;
    }

    let iterationCount = 2;
    let nextStart = offset + blockLength;

    while (
      nextStart + blockLength <= entries.length &&
      compareBlocks(entries, start, nextStart, blockLength)
    ) {
      iterationCount += 1;
      nextStart += blockLength;
    }

    if (iterationCount >= 2) {
      return { blockLength, iterationCount };
    }
  }

  return null;
}

function buildGroups(entries: DebugEntry[], offset: number): StepGroup[] {
  const groups: StepGroup[] = [];
  let index = 0;

  while (index < entries.length) {
    const loopInfo = detectLoop(entries, index);

    if (loopInfo) {
      const { blockLength, iterationCount } = loopInfo;
      const iterations: LoopIteration[] = [];

      for (let iteration = 0; iteration < iterationCount; iteration += 1) {
        const iterationStartLocal = index + iteration * blockLength;
        const iterationEndLocal = iterationStartLocal + blockLength;
        const globalStart = offset + iterationStartLocal;
        const globalEnd = offset + iterationEndLocal;

        const nestedEntries = entries.slice(
          iterationStartLocal + 1,
          iterationEndLocal
        );
        const nestedGroups = nestedEntries.length
          ? buildGroups(nestedEntries, globalStart + 1)
          : [];

        iterations.push({
          entryIndex: globalStart,
          entry: entries[iterationStartLocal],
          range: { start: globalStart, end: globalEnd },
          groups: nestedGroups,
        });
      }

      groups.push({
        type: "loop",
        line: entries[index].line,
        file: entries[index].file,
        startIndex: offset + index,
        iterations,
      });

      index += blockLength * iterationCount;
      continue;
    }

    const entry = entries[index];
    groups.push({
      type: "single",
      line: entry.line,
      entryIndex: offset + index,
      entry,
    });
    index += 1;
  }

  return groups;
}

export function groupDebugEntries(entries: DebugEntry[]): StepGroup[] {
  return buildGroups(entries, 0);
}
