import { debugStore } from "@/lib/debugStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let keepalive: NodeJS.Timeout | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      unsubscribe = debugStore.subscribe((event) => {
        if (event.type === "add") {
          send({ type: "add", payload: event.session });
        } else if (event.type === "delete") {
          send({ type: "delete", id: event.id });
        }
      });

      send({ type: "init", payload: debugStore.getSessions() });

      keepalive = setInterval(() => {
        controller.enqueue(encoder.encode(`:keep-alive\n\n`));
      }, 15000);
    },
    cancel() {
      if (keepalive) {
        clearInterval(keepalive);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
