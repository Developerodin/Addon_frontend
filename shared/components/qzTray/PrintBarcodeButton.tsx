"use client";

import { useState } from 'react';
import { printBarcode, connectQZ, getDefaultPrinter } from '@/shared/utils/qzTray';
import { toast } from 'react-hot-toast';

export interface PrintBarcodeButtonProps {
  barcode: string;
  boxId?: string;
  supplier?: string;
  yarnName?: string;
  shadeCode?: string;
  yarnColour?: string;
  shadeName?: string;
  lotNumber?: string;
  printerName?: string;
  copies?: number;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  onPrintSuccess?: () => void;
  onPrintError?: (error: string) => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Print Barcode Button Component
 * Handles QZ Tray barcode printing with error handling
 */
export const PrintBarcodeButton = ({
  barcode,
  boxId,
  supplier,
  yarnName,
  shadeCode,
  yarnColour,
  shadeName,
  lotNumber,
  printerName,
  copies = 1,
  className = '',
  disabled = false,
  children,
  onPrintSuccess,
  onPrintError,
  variant = 'primary',
  size = 'md',
}: PrintBarcodeButtonProps) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (!barcode || isPrinting) return;

    setIsPrinting(true);

    try {
      // Connect to QZ Tray
      const connection = await connectQZ();
      if (!connection.isConnected) {
        const errorMsg =
          connection.error ||
          'QZ Tray is not running. Please install and start QZ Tray from https://qz.io/download/';
        toast.error(errorMsg);
        onPrintError?.(errorMsg);
        setIsPrinting(false);
        return;
      }

      // Check printer availability
      if (!printerName) {
        const defaultPrinter = await getDefaultPrinter();
        if (!defaultPrinter) {
          const errorMsg = 'No printer found. Please set a default printer.';
          toast.error(errorMsg);
          onPrintError?.(errorMsg);
          setIsPrinting(false);
          return;
        }
      }

      // Print barcode
      const result = await printBarcode(barcode, {
        printerName,
        boxId,
        supplier,
        yarnName,
        shadeCode,
        yarnColour,
        shadeName,
        lotNumber,
        copies,
      });

      if (result.success) {
        toast.success(`Barcode printed successfully${copies > 1 ? ` (${copies} copies)` : ''}`);
        onPrintSuccess?.();
      } else {
        const errorMsg = result.error || 'Failed to print barcode';
        toast.error(errorMsg);
        onPrintError?.(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'An unexpected error occurred while printing';
      toast.error(errorMsg);
      onPrintError?.(errorMsg);
    } finally {
      setIsPrinting(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2',
    lg: 'px-4 py-3 text-lg',
  };

  const variantClasses = {
    primary: 'ti-btn-primary',
    secondary: 'ti-btn-secondary',
    success: 'ti-btn-success',
    danger: 'ti-btn-danger',
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={disabled || isPrinting || !barcode}
      className={`ti-btn ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${
        isPrinting ? 'opacity-75 cursor-not-allowed' : ''
      }`}
      title={isPrinting ? 'Printing...' : `Print barcode: ${barcode}`}
    >
      {isPrinting ? (
        <>
          <i className="ri-loader-4-line ri-spin me-2"></i>
          Printing...
        </>
      ) : (
        children || (
          <>
            <i className="ri-printer-line me-2"></i>
            Print Barcode
          </>
        )
      )}
    </button>
  );
};
