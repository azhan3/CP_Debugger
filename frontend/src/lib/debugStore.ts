import { z } from "zod";

export const DebugValueSchema = z.any();

export const DebugEntrySchema = z.object({
  line: z.number(),
  content: z
    .array(
      z.object({
        id: z.string(),
        value: DebugValueSchema,
      })
    )
    .default([]),
});

export const DebugPayloadSchema = z.array(DebugEntrySchema);

export type DebugEntry = z.infer<typeof DebugEntrySchema>;
export type DebugPayload = z.infer<typeof DebugPayloadSchema>;

export type StoreListener = (payload: DebugPayload) => void;

class DebugStore {
  private sessions: DebugPayload[] = [];
  private listeners: Set<StoreListener> = new Set();

  addSession(payload: DebugPayload) {
    this.sessions.push(payload);
    this.emit(payload);
  }

  getSessions() {
    return this.sessions;
  }

  getCounts() {
    return this.sessions.map((session) =>
      session.map((entry) => entry.content.length)
    );
  }

  subscribe(listener: StoreListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(payload: DebugPayload) {
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
