"use client";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  placeholder = "Scan or enter barcode",
  label,
  autoFocus = true,
  disabled = false,
}) => {
  const [scannedCode, setScannedCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && !disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setScannedCode(value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && scannedCode) {
      handleScan();
    }
  };

  const handleScan = () => {
    if (!scannedCode.trim()) {
      toast.error("Please enter or scan a barcode");
      return;
    }

    setIsScanning(true);
    // Simulate scan delay
    setTimeout(() => {
      onScan(scannedCode.trim());
      setScannedCode("");
      setIsScanning(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 300);
  };

  const simulateScan = () => {
    const mockBarcode = `BC-${Date.now()}`;
    setScannedCode(mockBarcode);
    handleScan();
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="form-label text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            className="form-control ps-10"
            placeholder={placeholder}
            value={scannedCode}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={disabled || isScanning}
          />
          <i className="ri-barcode-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
        <button
          type="button"
          onClick={handleScan}
          disabled={disabled || isScanning || !scannedCode}
          className="ti-btn ti-btn-primary"
        >
          {isScanning ? (
            <>
              <i className="ri-loader-4-line animate-spin me-1"></i>
              Scanning...
            </>
          ) : (
            <>
              <i className="ri-check-line me-1"></i>
              Confirm
            </>
          )}
        </button>
        <button
          type="button"
          onClick={simulateScan}
          disabled={disabled || isScanning}
          className="ti-btn ti-btn-light"
          title="Simulate Scan"
        >
          <i className="ri-qr-scan-line"></i>
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanner;

