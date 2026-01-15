/**
 * QZ Tray Utility Functions
 * Handles connection, printer detection, and ZPL barcode printing
 */

declare global {
  interface Window {
    qz?: any;
  }
}

export interface QZConnection {
  isConnected: boolean;
  error?: string;
}

export interface PrinterInfo {
  name: string;
  driver?: string;
}

/**
 * Check if QZ Tray script is loaded
 */
export const isQZLoaded = (): boolean => {
  return typeof window !== 'undefined' && typeof window.qz !== 'undefined';
};

/**
 * Load QZ Tray script dynamically
 */
export const loadQZScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isQZLoaded()) {
      resolve();
      return;
    }

    if (typeof window === 'undefined') {
      reject(new Error('QZ Tray can only be loaded in browser environment'));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.3/qz-tray.min.js';
    script.async = true;
    script.onload = () => {
      if (isQZLoaded()) {
        resolve();
      } else {
        reject(new Error('QZ Tray script loaded but qz object not found'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load QZ Tray script'));
    };
    document.head.appendChild(script);
  });
};

/**
 * Connect to QZ Tray
 */
export const connectQZ = async (): Promise<QZConnection> => {
  try {
    if (!isQZLoaded()) {
      await loadQZScript();
    }

    if (!window.qz) {
      return {
        isConnected: false,
        error: 'QZ Tray is not installed or not running. Please install QZ Tray from https://qz.io/download/',
      };
    }

    // Check if already connected
    if (window.qz.websocket.isActive()) {
      return { isConnected: true };
    }

    // Connect to QZ Tray
    await window.qz.websocket.connect();
    return { isConnected: true };
  } catch (error: any) {
    return {
      isConnected: false,
      error: error?.message || 'Failed to connect to QZ Tray. Make sure QZ Tray is running.',
    };
  }
};

/**
 * Disconnect from QZ Tray
 */
export const disconnectQZ = async (): Promise<void> => {
  if (isQZLoaded() && window.qz?.websocket?.isActive()) {
    try {
      await window.qz.websocket.disconnect();
    } catch (error) {
      console.error('Error disconnecting from QZ Tray:', error);
    }
  }
};

/**
 * Get default printer
 */
export const getDefaultPrinter = async (): Promise<PrinterInfo | null> => {
  try {
    if (!isQZLoaded() || !window.qz?.websocket?.isActive()) {
      const connection = await connectQZ();
      if (!connection.isConnected) {
        throw new Error(connection.error || 'Not connected to QZ Tray');
      }
    }

    const printer = await window.qz.printers.getDefault();
    return { name: printer };
  } catch (error: any) {
    console.error('Error getting default printer:', error);
    return null;
  }
};

/**
 * Get list of available printers
 */
export const getAvailablePrinters = async (): Promise<PrinterInfo[]> => {
  try {
    if (!isQZLoaded() || !window.qz?.websocket?.isActive()) {
      const connection = await connectQZ();
      if (!connection.isConnected) {
        throw new Error(connection.error || 'Not connected to QZ Tray');
      }
    }

    const printers = await window.qz.printers.find();
    return printers.map((name: string) => ({ name }));
  } catch (error: any) {
    console.error('Error getting available printers:', error);
    return [];
  }
};

/**
 * Generate ZPL code for barcode label
 * Optimized for box labels on thermal printers (Zebra, etc.)
 */
export const generateZPLBarcode = (
  barcodeValue: string,
  options: {
    boxId?: string;
    supplier?: string;
    yarnName?: string;
    shadeCode?: string;
    yarnColour?: string;
    shadeName?: string;
    lotNumber?: string;
    labelWidth?: number; // in dots (203 DPI = ~8 inches = 1624 dots)
    labelHeight?: number; // in dots
  } = {}
): string => {
  const {
    boxId = '',
    supplier = '',
    yarnName = '',
    shadeCode = '',
    yarnColour = '',
    shadeName = '',
    lotNumber = '',
    labelWidth = 609, // 3 inches at 203 DPI (default for 4x3 labels)
    labelHeight = 406, // 2 inches at 203 DPI
  } = options;

  // ZPL commands
  // ^XA = Start of label
  // ^FO = Field Origin (x, y position)
  // ^A0 = Font 0 (default)
  // ^FD = Field Data
  // ^BY = Barcode parameters (module width, ratio, height)
  // ^BC = Code 128 barcode
  // ^XZ = End of label

  const fontSize = 20;
  const smallFontSize = 15;
  const barcodeHeight = 80;
  const lineHeight = 25;
  let yPos = 20;

  let zpl = `^XA\n`; // Start label
  zpl += `^CF0,${fontSize}\n`; // Set font

  // Box ID (top)
  if (boxId) {
    zpl += `^FO20,${yPos}^FDBox ID: ${boxId}^FS\n`;
    yPos += lineHeight + 5;
  }

  // Barcode (centered, larger)
  const barcodeY = yPos;
  zpl += `^FO20,${barcodeY}^BY3,2,${barcodeHeight}^BCN,${barcodeHeight},Y,N,N^FD${barcodeValue}^FS\n`;
  yPos += barcodeHeight + 15;

  // Barcode value text below barcode
  zpl += `^CF0,${smallFontSize}\n`;
  zpl += `^FO20,${yPos}^FD${barcodeValue}^FS\n`;
  yPos += lineHeight + 10;

  // Details section
  if (supplier || yarnName || shadeCode || yarnColour || shadeName || lotNumber) {
    zpl += `^FO20,${yPos}^GB570,1,1^FS\n`; // Horizontal line
    yPos += 5;

    if (supplier) {
      zpl += `^FO20,${yPos}^FDSupplier: ${supplier.substring(0, 30)}^FS\n`;
      yPos += lineHeight;
    }
    if (yarnName) {
      zpl += `^FO20,${yPos}^FDYarn: ${yarnName.substring(0, 30)}^FS\n`;
      yPos += lineHeight;
    }
    if (shadeCode) {
      zpl += `^FO20,${yPos}^FDShade: ${shadeCode.substring(0, 30)}^FS\n`;
      yPos += lineHeight;
    }
    if (yarnColour) {
      zpl += `^FO20,${yPos}^FDColour: ${yarnColour.substring(0, 30)}^FS\n`;
      yPos += lineHeight;
    }
    if (shadeName) {
      zpl += `^FO20,${yPos}^FDShade Name: ${shadeName.substring(0, 30)}^FS\n`;
      yPos += lineHeight;
    }
    if (lotNumber) {
      zpl += `^FO20,${yPos}^FDLot: ${lotNumber}^FS\n`;
      yPos += lineHeight;
    }
  }

  zpl += `^XZ\n`; // End label

  return zpl;
};

/**
 * Print barcode using ZPL
 */
export const printBarcode = async (
  barcodeValue: string,
  options: {
    printerName?: string;
    boxId?: string;
    supplier?: string;
    yarnName?: string;
    shadeCode?: string;
    yarnColour?: string;
    shadeName?: string;
    lotNumber?: string;
    copies?: number;
  } = {}
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Ensure connected
    if (!isQZLoaded() || !window.qz?.websocket?.isActive()) {
      const connection = await connectQZ();
      if (!connection.isConnected) {
        return {
          success: false,
          error: connection.error || 'Not connected to QZ Tray',
        };
      }
    }

    // Get printer name
    let printerName = options.printerName;
    if (!printerName) {
      const defaultPrinter = await getDefaultPrinter();
      if (!defaultPrinter) {
        return {
          success: false,
          error: 'No printer found. Please set a default printer or specify a printer name.',
        };
      }
      printerName = defaultPrinter.name;
    }

    // Generate ZPL
    const zpl = generateZPLBarcode(barcodeValue, {
      boxId: options.boxId,
      supplier: options.supplier,
      yarnName: options.yarnName,
      shadeCode: options.shadeCode,
      yarnColour: options.yarnColour,
      shadeName: options.shadeName,
      lotNumber: options.lotNumber,
    });

    // Print
    const copies = options.copies || 1;
    for (let i = 0; i < copies; i++) {
      await window.qz.print(printerName, zpl);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error printing barcode:', error);
    return {
      success: false,
      error: error?.message || 'Failed to print barcode',
    };
  }
};

/**
 * Print multiple barcodes sequentially
 */
export const printMultipleBarcodes = async (
  barcodes: Array<{
    barcodeValue: string;
    boxId?: string;
    supplier?: string;
    yarnName?: string;
    shadeCode?: string;
    yarnColour?: string;
    shadeName?: string;
    lotNumber?: string;
  }>,
  options: {
    printerName?: string;
    delayBetweenPrints?: number; // milliseconds
  } = {}
): Promise<{ success: boolean; printed: number; errors: string[] }> => {
  const errors: string[] = [];
  let printed = 0;
  const delay = options.delayBetweenPrints || 500;

  for (const barcode of barcodes) {
    const result = await printBarcode(barcode.barcodeValue, {
      printerName: options.printerName,
      ...barcode,
    });

    if (result.success) {
      printed++;
    } else {
      errors.push(`${barcode.barcodeValue}: ${result.error}`);
    }

    // Small delay between prints to avoid overwhelming the printer
    if (delay > 0 && printed < barcodes.length) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: errors.length === 0,
    printed,
    errors,
  };
};
