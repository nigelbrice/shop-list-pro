import type { Response } from "express";

export type SSEEvent =
  | { type: "item:created"; data: Record<string, unknown> }
  | { type: "item:updated"; data: Record<string, unknown> }
  | { type: "item:deleted"; data: { id: number } }
  | { type: "item:reordered"; data: { orderedIds: number[] } }
  | { type: "store:created"; data: Record<string, unknown> }
  | { type: "store:deleted"; data: { id: number } }
  | { type: "store:list:added"; data: Record<string, unknown> }
  | { type: "store:list:updated"; data: Record<string, unknown> }
  | { type: "store:list:removed"; data: { storeId: number; listItemId: number } }
  | { type: "store:list:reordered"; data: { storeId: number; orderedIds: number[] } }
  | { type: "presence"; data: { count: number } };

const clientsByAccount = new Map<number, Set<Response>>();

export function addClient(res: Response, accountId: number) {
  if (!clientsByAccount.has(accountId)) clientsByAccount.set(accountId, new Set());
  clientsByAccount.get(accountId)!.add(res);
  broadcastPresence(accountId);
}

export function removeClient(res: Response, accountId: number) {
  const set = clientsByAccount.get(accountId);
  if (set) {
    set.delete(res);
    if (set.size === 0) clientsByAccount.delete(accountId);
    else broadcastPresence(accountId);
  }
}

export function broadcast(event: SSEEvent, accountId: number) {
  const clients = clientsByAccount.get(accountId);
  if (!clients) return;
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

function broadcastPresence(accountId: number) {
  const count = clientsByAccount.get(accountId)?.size ?? 0;
  broadcast({ type: "presence", data: { count } }, accountId);
}

export function getClientCount(accountId: number) {
  return clientsByAccount.get(accountId)?.size ?? 0;
}
