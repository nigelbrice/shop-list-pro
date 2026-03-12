import { supabase } from "./supabase";

// =============================================
// TYPES
// =============================================

// Every pending operation we need to flush to
// Supabase when the user comes back online.
export type PendingOp = {
  id: string;          // unique id for this operation
  table: "items" | "stores" | "store_list_items";
  action: "upsert" | "delete";
  payload: any;        // the row data (for upsert) or { id } (for delete)
  accountId: number;
  timestamp: string;   // when the change was made locally
};

const QUEUE_KEY = "shopeeze_pending_ops";

// =============================================
// PENDING QUEUE HELPERS
// The queue lives in localStorage so it
// survives a page refresh or app close.
// =============================================

export function getQueue(): PendingOp[] {
  try {
    const saved = localStorage.getItem(QUEUE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: PendingOp[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Add a new operation to the queue
export function enqueue(op: Omit<PendingOp, "id" | "timestamp">) {
  const queue = getQueue();

  // If there's already a pending op for the same row + table,
  // replace it — no point sending two updates for the same item.
  const filtered = queue.filter(
    (existing) =>
      !(
        existing.table === op.table &&
        existing.payload?.id === op.payload?.id
      )
  );

  const newOp: PendingOp = {
    ...op,
    id: `${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
  };

  saveQueue([...filtered, newOp]);
}

// Remove a successfully synced operation from the queue
function dequeue(opId: string) {
  const queue = getQueue().filter((op) => op.id !== opId);
  saveQueue(queue);
}

// =============================================
// PUSH — send local changes up to Supabase
// Called on reconnect to flush the queue.
// =============================================

export async function flushQueue(): Promise<void> {
  const queue = getQueue();
  if (queue.length === 0) return;

  console.log(`[sync] Flushing ${queue.length} pending operations...`);

  for (const op of queue) {
    try {
      if (op.action === "upsert") {
        const { error } = await supabase
          .from(op.table)
          .upsert(op.payload, { onConflict: "id" });

        if (error) throw error;

      } else if (op.action === "delete") {
        const { error } = await supabase
          .from(op.table)
          .delete()
          .eq("id", op.payload.id);

        if (error) throw error;
      }

      // Success — remove from queue
      dequeue(op.id);
      console.log(`[sync] ✓ ${op.action} ${op.table} id=${op.payload?.id}`);

    } catch (err) {
      // Leave it in the queue — will retry next reconnect
      console.warn(`[sync] ✗ Failed to sync ${op.table} id=${op.payload?.id}:`, err);
    }
  }
}

// =============================================
// PULL — fetch latest data from Supabase
// Called on load and on reconnect so we pick
// up any changes other users made while we
// were offline.
// =============================================

export async function pullItems(accountId: number) {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("account_id", accountId);

  if (error) {
    console.warn("[sync] Could not pull items:", error.message);
    return null;
  }
  return data;
}

export async function pullStores(accountId: number) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("account_id", accountId);

  if (error) {
    console.warn("[sync] Could not pull stores:", error.message);
    return null;
  }
  return data;
}

export async function pullStoreListItems(accountId: number) {
  const { data, error } = await supabase
    .from("store_list_items")
    .select("*")
    .eq("account_id", accountId);

  if (error) {
    console.warn("[sync] Could not pull store list items:", error.message);
    return null;
  }
  return data;
}

// =============================================
// MERGE HELPER
// Given a local array and a remote array,
// return the merged result where the row with
// the most recent updated_at wins.
// Any rows only in remote get added locally.
// Any rows only in local stay (they may be
// pending an upload).
// =============================================

export function mergeRows<T extends { id: number; updated_at?: string }>(
  local: T[],
  remote: T[]
): T[] {
  const merged = new Map<number, T>();

  // Start with all local rows
  for (const row of local) {
    merged.set(row.id, row);
  }

  // Layer in remote rows — remote wins if it's newer
  for (const row of remote) {
    const existing = merged.get(row.id);

    if (!existing) {
      // New row from another user — add it
      merged.set(row.id, row);
    } else {
      const localTime = new Date(existing.updated_at ?? 0).getTime();
      const remoteTime = new Date(row.updated_at ?? 0).getTime();

      if (remoteTime > localTime) {
        // Remote is newer — use it
        merged.set(row.id, row);
      }
      // Otherwise keep local (it's newer or the same)
    }
  }

  return Array.from(merged.values());
}