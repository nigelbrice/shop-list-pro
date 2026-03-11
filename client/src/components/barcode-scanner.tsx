import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Props = {
  onScan: (barcode: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onScan, onClose }: Props) {

  const scannedRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {

    scannedRef.current = false;

    const scanner = new Html5Qrcode("scanner");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 280, height: 200 } },
      (decodedText) => {

        if (scannedRef.current) return;
        scannedRef.current = true;

        scanner.stop().catch(() => {});
        onScan(decodedText);

      },
      () => {}
    ).catch(err => {
      console.error("Scanner failed to start:", err);
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };

  }, [onScan]);

  return (
    <div className="space-y-3">

      <div
        id="scanner"
        className="w-full rounded-xl overflow-hidden"
      />

      <button
        onClick={() => {
          if (scannerRef.current) {
            scannerRef.current.stop().catch(() => {});
          }
          onClose();
        }}
        className="text-sm text-muted-foreground"
      >
        Cancel
      </button>

    </div>
  );
}