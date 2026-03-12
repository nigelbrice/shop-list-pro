import { supabase } from "./supabase";

// =============================================
// TYPES
// =============================================

export type PendingOp = {
  id: string;
  table: "items" | "stores" | "store_list_items";
  action: "upsert" | "delete";
  payload: any;
  accountId: number;
  timestamp: string;
};

const QUEUE_KEY = "shopeeze_pending_ops";

// =============================================
// PENDING QUEUE HELPERS
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

export function enqueue(op: Omit<PendingOp, "id" | "timestamp">) {
  const queue = getQueue();

  // Replace any existing pending op for the same row
  // so we don't send redundant updates
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

  // Try to flush immediately if online
  if (navigator.onLine) {
    flushQueue().catch(() => {});
  }
}

function dequeue(opId: string) {
  const queue = getQueue().filter((op) => op.id !== opId);
  saveQueue(queue);
}

// =============================================
// FLUSH QUEUE — push local changes to Supabase
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
          .eq("id", op.payload.id)
          .eq("account_id", op.accountId);

        if (error) throw error;
      }

      dequeue(op.id);
      console.log(`[sync] ✓ ${op.action} ${op.table} id=${op.payload?.id}`);

    } catch (err) {
      console.warn(`[sync] ✗ Failed to sync ${op.table} id=${op.payload?.id}:`, err);
    }
  }
}

// =============================================
// PULL — fetch latest data from Supabase
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
// Merges local and remote arrays by id.
// The row with the most recent updated_at wins.
// Rows only in remote get added locally.
// Rows only in local stay (may be pending sync).
// =============================================

export function mergeRows<T extends { id: number; updated_at?: string }>(
  local: T[],
  remote: T[]
): T[] {
  const merged = new Map<number, T>();

  for (const row of local) {
    merged.set(row.id, row);
  }

  for (const row of remote) {
    const existing = merged.get(row.id);

    if (!existing) {
      // New row from another user — add it
      merged.set(row.id, row);
    } else {
      const localTime = new Date(existing.updated_at ?? 0).getTime();
      const remoteTime = new Date(row.updated_at ?? 0).getTime();

      if (remoteTime > localTime) {
        // Remote is newer — use it but preserve
        // local imageUrl since images aren't in Supabase
        merged.set(row.id, {
          ...row,
          imageUrl: (existing as any).imageUrl ?? (row as any).imageUrl,
        });
      }
    }
  }

  return Array.from(merged.values());
}