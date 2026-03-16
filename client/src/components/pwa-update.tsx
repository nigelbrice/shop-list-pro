/// <reference types="vite-plugin-pwa/react" />
import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

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

  // As soon as a new version is available, apply it automatically.
  // The service worker has skipWaiting + clientsClaim so it takes
  // over immediately, then we reload to pick up the new assets.
  useEffect(() => {
    if (needRefresh) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}