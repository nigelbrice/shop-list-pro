import { getQueue, clearQueue } from "./changeQueue";
import { api } from "@shared/routes";

export async function syncItems() {
  if (!navigator.onLine) return;

  const queue = getQueue();
  if (!queue.length) return;

  try {
    for (const change of queue) {
      if (change.type === "create") {
        await fetch(api.items.create.path, {
          method: api.items.create.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(change.payload),
          credentials: "include",
        });
      }

      if (change.type === "update") {
        const { id, updates } = change.payload;

        await fetch(`/api/items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
          credentials: "include",
        });
      }

      if (change.type === "delete") {
        await fetch(`/api/items/${change.payload.id}`, {
          method: "DELETE",
          credentials: "include",
        });
      }
    }

    clearQueue();
  } catch (err) {
    console.error("Sync failed", err);
  }
}