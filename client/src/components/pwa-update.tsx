/// <reference types="vite-plugin-pwa/react" />
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw } from "lucide-react";

export function PwaUpdater() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      // Check for updates every 60 seconds
      if (r) {
        setInterval(() => r.update(), 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="flex items-center justify-between gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2 text-sm font-medium">
          <RefreshCw className="w-4 h-4 shrink-0" />
          New version available
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="shrink-0 bg-primary-foreground text-primary text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          Update now
        </button>
      </div>
    </div>
  );
}