import { getQueue, removeFromQueue } from "./syncQueue";
import { supabase } from "./supabase";

export async function processSyncQueue() {
  const events = await getQueue();

  for (const event of events) {
    try {
      if (event.type === "ADD") {
        await supabase.from("items").insert(event.payload);
      }

      if (event.type === "UPDATE") {
        await supabase
          .from("items")
          .update(event.payload)
          .eq("id", event.payload.id);
      }

      if (event.type === "DELETE") {
        await supabase
          .from("items")
          .delete()
          .eq("id", event.payload.id);
      }

      await removeFromQueue(event.id);
    } catch (err) {
      console.error("Sync failed", err);
    }
  }
}