import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2 } from "lucide-react";

type Props = {
  onScan: (barcode: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onScan, onClose }: Props) {

  const scannedRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {

    scannedRef.current = false;

    const scanner = new Html5Qrcode("qr-scanner-container");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 280, height: 200 } },

      // SUCCESS: barcode detected
      (decodedText) => {

        // Ignore if we already handled a scan
        if (scannedRef.current) return;
        scannedRef.current = true;

        // Wait for the scanner to fully stop BEFORE calling onScan.
        // This prevents the race condition that caused the blank screen.
        scanner.stop()
          .catch(() => {})
          .finally(() => {
            onScan(decodedText);
          });
      },

      // ERROR: frame decode failure — happens constantly, just ignore
      () => {}

    )
      .then(() => setStarting(false))
      .catch((err) => {
        console.error("Scanner failed to start:", err);
        setError("Could not access camera. Please check permissions and try again.");
        setStarting(false);
      });

    // Cleanup: stop scanner when component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {});
        scannerRef.current = null;
      }
    };

  // Empty dependency array — scanner should only start once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCancel() {
    const scanner = scannerRef.current;
    if (scanner) {
      scanner.stop().catch(() => {}).finally(() => onClose());
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 gap-4">

      <div className="bg-card rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">

        {/* Header */}
        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <span className="font-semibold">Scan Barcode</span>
          <button
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Scanner viewport */}
        <div className="relative bg-black">

          {starting && !error && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
            </div>
          )}

          {error ? (
            <div className="flex items-center justify-center h-48 px-6 text-center text-sm text-red-400">
              {error}
            </div>
          ) : (
            <div
              id="qr-scanner-container"
              className="w-full"
            />
          )}

        </div>

        {/* Footer hint */}
        {!error && (
          <div className="px-4 py-3 text-center text-sm text-muted-foreground">
            Point your camera at a barcode
          </div>
        )}

      </div>

      <button
        onClick={handleCancel}
        className="text-white/70 hover:text-white text-sm"
      >
        Cancel
      </button>

    </div>
  );
}