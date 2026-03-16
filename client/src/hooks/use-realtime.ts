import { useEffect, useRef } from "react";

interface PresenceData { count: number }

export function useRealtime(onPresenceChange: (count: number) => void) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let active = true; // prevents reconnect after unmount

    function connect() {
      // Clean up any existing connection first
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      if (!active) return;

      const es = new EventSource("/api/events");
      esRef.current = es;

      es.addEventListener("presence", (e) => {
        const data: PresenceData = JSON.parse(e.data);
        onPresenceChange(data.count);
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;
        // Only reconnect if this hook is still mounted
        if (active) {
          setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      active = false;
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);
}