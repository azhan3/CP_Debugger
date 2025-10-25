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
  id: z.string().optional(),
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
