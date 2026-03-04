import type { Response } from "express";

export type SSEEvent =
  | { type: "item:created"; data: Record<string, unknown> }
  | { type: "item:updated"; data: Record<string, unknown> }
  | { type: "item:deleted"; data: { id: number } }
  | { type: "item:reordered"; data: { orderedIds: number[] } }
  | { type: "presence"; data: { count: number } };

const clients = new Set<Response>();

export function addClient(res: Response) {
  clients.add(res);
  broadcastPresence();
}

export function removeClient(res: Response) {
  clients.delete(res);
  broadcastPresence();
}

export function broadcast(event: SSEEvent) {
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

function broadcastPresence() {
  broadcast({ type: "presence", data: { count: clients.size } });
}

export function getClientCount() {
  return clients.size;
}
