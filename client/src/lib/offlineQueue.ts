type OfflineAction = {
  url: string;
  method: string;
  body?: any;
};

const QUEUE_KEY = "offline-actions";

export function addOfflineAction(action: OfflineAction) {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  queue.push(action);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function safeFetch(
  url: string,
  options: RequestInit = {}
) {
  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      throw new Error("Request failed");
    }

    return res;
  } catch (error) {
    addOfflineAction({
      url,
      method: options.method || "GET",
      body: options.body ? JSON.parse(options.body as string) : undefined,
    });

    throw error;
  }
}

export async function processOfflineQueue() {
  if (!navigator.onLine) return;

  const queue: OfflineAction[] = JSON.parse(
    localStorage.getItem(QUEUE_KEY) || "[]"
  );

  const remaining: OfflineAction[] = [];

  for (const action of queue) {
    try {
      await fetch(action.url, {
        method: action.method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: action.body ? JSON.stringify(action.body) : undefined,
      });
    } catch {
      remaining.push(action);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}