// client/src/lib/idGenerator.ts

/**
 * Generates unique integer IDs for temporary local items
 * before they get synced to Supabase and receive real IDs.
 * 
 * Uses timestamp + counter to ensure uniqueness even when
 * multiple items are created in the same millisecond.
 */

let counter = 0;

export function generateTempId(): number {
  const timestamp = Date.now();
  const uniqueId = timestamp * 1000 + (counter % 1000);
  counter++;
  return uniqueId;
}
