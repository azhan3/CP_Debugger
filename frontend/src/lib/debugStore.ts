import { z } from "zod";

export const DebugValueSchema = z.any();

export const DebugEntrySchema = z.object({
  line: z.number(),
  file: z.string().optional(),
  content: z
    .array(
      z.object({
        id: z.string(),
        value: DebugValueSchema,
      })
    )
    .default([]),
});

export const DebugSessionSchema = z.object({
  entries: z.array(DebugEntrySchema),
  code: z.string().optional(),
  file: z.string().optional(),
});

export type DebugEntry = z.infer<typeof DebugEntrySchema>;
export type DebugSession = z.infer<typeof DebugSessionSchema>;

export type StoreListener = (payload: DebugSession) => void;

class DebugStore {
  private sessions: DebugSession[] = [];
  private listeners: Set<StoreListener> = new Set();

  addSession(payload: DebugSession) {
    this.sessions.push(payload);
    this.emit(payload);
  }

  getSessions() {
    return this.sessions;
  }

  getCounts() {
    return this.sessions.map((session) =>
      session.entries.map((entry) => entry.content.length)
    );
  }

  subscribe(listener: StoreListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(payload: DebugSession) {
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error("Failed to notify store listener", error);
      }
    });
  }
}

export const debugStore = new DebugStore();
