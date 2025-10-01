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

export const DebugSessionPayloadSchema = z.object({
  entries: z.array(DebugEntrySchema),
  code: z.string().optional(),
  file: z.string().optional(),
});

export const DebugSessionSchema = DebugSessionPayloadSchema.extend({
  id: z.string(),
});

export type DebugEntry = z.infer<typeof DebugEntrySchema>;
export type DebugSessionPayload = z.infer<typeof DebugSessionPayloadSchema>;
export type DebugSession = z.infer<typeof DebugSessionSchema>;

export type StoreEvent =
  | { type: "add"; session: DebugSession }
  | { type: "delete"; id: string };

export type StoreListener = (event: StoreEvent) => void;

class DebugStore {
  private sessions: DebugSession[] = [];
  private listeners: Set<StoreListener> = new Set();

  addSession(payload: DebugSession) {
    this.sessions.push(payload);
    this.emit({ type: "add", session: payload });
  }

  removeSession(id: string) {
    const previousLength = this.sessions.length;
    this.sessions = this.sessions.filter((session) => session.id !== id);
    const removed = previousLength !== this.sessions.length;
    if (removed) {
      this.emit({ type: "delete", id });
    }
    return removed;
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

  private emit(event: StoreEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Failed to notify store listener", error);
      }
    });
  }
}

export const debugStore = new DebugStore();
