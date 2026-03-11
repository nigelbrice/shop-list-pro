import { useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Props = {
  onScan: (barcode: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onScan, onClose }: Props) {

  useEffect(() => {

    const scanner = new Html5Qrcode("scanner");

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        scanner.stop();
        onScan(decodedText);
      },
      () => {}
    );

    return () => {
      scanner.stop().catch(() => {});
    };

  }, [onScan]);

  return (
    <div className="space-y-3">

      <div
        id="scanner"
        className="w-full rounded-xl overflow-hidden"
      />

      <button
        onClick={onClose}
        className="text-sm text-muted-foreground"
      >
        Cancel
      </button>

    </div>
  );
}