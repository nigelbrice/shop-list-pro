/// <reference types="vite-plugin-pwa/react" />
import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

// Exposed so layout.tsx can trigger a manual update check
export const pwaCheckRef = { check: async () => {} };

export function PwaUpdater() {
  const regRef = useRef<ServiceWorkerRegistration | undefined>(undefined);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      if (!r) return;
      regRef.current = r;

      // Check for updates every 60 seconds
      setInterval(() => r.update(), 60 * 1000);

      // If a worker is already waiting, activate it immediately
      if (r.waiting) {
        r.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      // Listen for future waiting workers and activate them
      r.addEventListener("updatefound", () => {
        const newWorker = r.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    },
  });

  // Wire up the manual check function used by layout.tsx
  useEffect(() => {
    pwaCheckRef.check = async () => {
      const r = regRef.current;
      if (!r) return;

      // Trigger a network check for a new service worker
      await r.update();

      // If one is already waiting, skip straight to activation
      if (r.waiting) {
        r.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    };
  }, []);

  // Auto-apply when needRefresh fires
  useEffect(() => {
    if (!needRefresh) return;
    updateServiceWorker(true);
  }, [needRefresh, updateServiceWorker]);

  // Reload when new worker takes over
  useEffect(() => {
    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
  }, []);

  return null;
}