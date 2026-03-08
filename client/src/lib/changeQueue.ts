const STORAGE_KEY = "shopeeze-change-queue";

type QueueItem = {
  type: "create" | "update" | "delete";
  payload: any;
};

export function getQueue(): QueueItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToQueue(item: QueueItem) {
  const queue = getQueue();
  queue.push(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function clearQueue() {
  localStorage.removeItem(STORAGE_KEY);
}