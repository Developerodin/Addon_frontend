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
 * CDN URLs to try in order (2.2.5 is the working version)
 */
const QZ_CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/qz-tray@2.2.5/qz-tray.js',
  'https://cdn.jsdelivr.net/npm/qz-tray@2.2.5/qz-tray.min.js',
  'https://unpkg.com/qz-tray@2.2.5/qz-tray.js',
  'https://unpkg.com/qz-tray@2.2.5/qz-tray.min.js'
];

/**
 * Load QZ Tray script dynamically with fallback CDN support
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

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="qz-tray"]');
    if (existingScript) {
      // Wait for existing script to load
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds total
      const checkInterval = setInterval(() => {
        attempts++;
        if (isQZLoaded()) {
          clearInterval(checkInterval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('QZ Tray script loaded but qz object not found'));
        }
      }, 100);
      return;
    }

    // Try each CDN URL until one works
    let currentIndex = 0;
    let lastError: Error | null = null;

    const tryNextCDN = () => {
      if (currentIndex >= QZ_CDN_URLS.length) {
        reject(new Error(
          `Failed to load QZ Tray from all CDN sources.\n\n` +
          `Tried URLs:\n${QZ_CDN_URLS.join('\n')}\n\n` +
          `Possible issues:\n` +
          `1. No internet connection\n` +
          `2. All CDNs are blocked\n` +
          `3. Content Security Policy restrictions\n` +
          `4. Check browser console (F12) for detailed errors`
        ));
        return;
      }

      const url = QZ_CDN_URLS[currentIndex];
      if (typeof window !== 'undefined' && (window as any).console) {
        console.log(`[QZ Tray] Attempting to load from: ${url}`);
      }

      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        // Wait a bit for qz to be available, check multiple times
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds total
        const checkInterval = setInterval(() => {
          attempts++;
          if (isQZLoaded()) {
            clearInterval(checkInterval);
            if (typeof window !== 'undefined' && (window as any).console) {
              console.log(`[QZ Tray] ✅ Loaded successfully from: ${url}`);
            }
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            // Try next CDN
            currentIndex++;
            tryNextCDN();
          }
        }, 100);
      };

      script.onerror = (error) => {
        if (typeof window !== 'undefined' && (window as any).console) {
          console.error(`[QZ Tray] ❌ Failed to load from ${url}:`, error);
        }
        lastError = new Error(`Failed to load from ${url}`);
        currentIndex++;
        tryNextCDN();
      };

      document.head.appendChild(script);
    };

    tryNextCDN();
  });
};

/**
 * Digital certificate fetched from the server
 */
let cachedCertificate: string | null = null;

/**
 * Fetches the digital certificate from the server API
 */
const fetchCertificate = async (): Promise<string | null> => {
  if (cachedCertificate) return cachedCertificate;

  try {
    const response = await fetch('/api/qz-tray/certificate');
    if (!response.ok) throw new Error('Failed to fetch certificate');
    const cert = await response.text();
    cachedCertificate = cert;
    return cert;
  } catch (error) {
    console.error('[QZ Tray] Error fetching certificate:', error);
    return null;
  }
};

/**
 * Configure QZ Tray security promises for digital signing
 * MUST only be called once per session
 */
let securityConfigured = false;
const configureQZSecurity = () => {
  if (!isQZLoaded() || securityConfigured) return;

  console.log('[QZ Tray] Configuring security promises (SHA1)...');

  // 1. Set the certificate
  window.qz.security.setCertificatePromise(async (resolve: any, reject: any) => {
    const cert = await fetchCertificate();
    if (cert) {
      resolve(cert);
    } else {
      reject('Could not load certificate from server');
    }
  });

  // 2. Set the signature algorithm explicitly to SHA1 (demo cert compatibility)
  window.qz.security.setSignatureAlgorithm("SHA1");

  // 3. Set the signature promise (calls our Next.js API route)
  // This must be set BEFORE connecting to allow automatic trust persistence
  window.qz.security.setSignaturePromise((toSign: string) => {
    return (resolve: any, reject: any) => {
      fetch('/api/qz-tray/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: toSign
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Signing failed: ${response.statusText}`);
          }
          return response.text();
        })
        .then(signature => resolve(signature))
        .catch(error => {
          console.error('[QZ Tray] Signing error:', error);
          reject(error);
        });
    };
  });

  securityConfigured = true;
};

/**
 * Check if current site is trusted by QZ Tray
 */
const checkSiteTrust = (): { isTrusted: boolean; message: string } => {
  const protocol = typeof window !== 'undefined' ? window.location.protocol : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  // HTTPS is always trusted
  if (protocol === 'https:') {
    return { isTrusted: true, message: 'HTTPS connection - certificate will be trusted' };
  }

  // localhost is usually trusted
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { isTrusted: true, message: 'Localhost connection - certificate prompt may appear' };
  }

  // HTTP on non-localhost may show "Untrusted website"
  return {
    isTrusted: false,
    message: 'HTTP connection detected. For better security, use HTTPS. Certificate prompt will appear.'
  };
};

/**
 * Display helpful instructions for certificate approval
 */
const showCertificateInstructions = () => {
  if (typeof window === 'undefined' || !(window as any).console) {
    return;
  }

  console.group('%c🔒 QZ Tray Certificate Approval Required', 'color: #ff6b6b; font-weight: bold; font-size: 14px;');
  console.log('%c⚠️ IMPORTANT: Order matters! Follow these steps:', 'color: #ff6b6b; font-weight: bold;');
  console.log('1. ✅ FIRST: CHECK "Remember this decision" checkbox (CRITICAL!)');
  console.log('2. THEN: Click "Allow" button');
  console.log('');
  console.log('%c💡 Note:', 'color: #4a90e2; font-weight: bold;');
  console.log('• After checking the checkbox, Allow button might appear disabled briefly');
  console.log('• This is normal - QZ Tray is processing the certificate');
  console.log('• Wait a moment and the button will become enabled');
  console.log('');
  console.log('%cIf "Remember this decision" checkbox is disabled or grayed out:', 'color: #ffa500;');
  console.log('• Close QZ Tray completely');
  console.log('• Delete certificate cache:');
  console.log('  - Windows: %APPDATA%\\qz\\auth\\');
  console.log('  - macOS: ~/Library/Application Support/qz/auth/');
  console.log('  - Linux: ~/.qz/auth/');
  console.log('• Restart QZ Tray');
  console.log('• Try connecting again');
  console.groupEnd();
};

/**
 * Connect to QZ Tray with automatic certificate handling
 * Uses a singleton promise to prevent concurrent connection attempts
 */
let connectionPromise: Promise<QZConnection> | null = null;
export const connectQZ = async (): Promise<QZConnection> => {
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async (): Promise<QZConnection> => {
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

      // Configure security promises ONCE (digital signing)
      if (!securityConfigured) {
        configureQZSecurity();
      }

      // Check if already connected
      if (window.qz.websocket.isActive()) {
        return { isConnected: true };
      }

      const isHTTP = typeof window !== 'undefined' && window.location.protocol === 'http:';
      const isLocalhost = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const isUntrusted = isHTTP && !isLocalhost;

      // Show instructions before connecting (in case prompt appears)
      showCertificateInstructions();

      // Show visual warning if HTTP (untrusted website)
      if (isUntrusted && typeof window !== 'undefined') {
        const currentUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
        const httpsUrl = `https://${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
        const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(window.location.hostname);

        window.dispatchEvent(new CustomEvent('qz-tray-untrusted-warning', {
          detail: { currentUrl, httpsUrl, isIP, hostname: window.location.hostname }
        }));
      }

      // Connect to QZ Tray
      try {
        await window.qz.websocket.connect();

        if (typeof window !== 'undefined' && (window as any).console) {
          console.info('[QZ Tray] ✅ Connected successfully');
          if (isUntrusted) {
            console.info('[QZ Tray] ℹ️ Connected on HTTP - if certificate prompt keeps appearing:');
            console.info('[QZ Tray] 💡 Tip: Using HTTPS or adding to "Site Manager" fixes this.');
          }
        }
        return { isConnected: true };
      } catch (connectError: any) {
        const errorMessage = connectError?.message || 'Failed to connect to QZ Tray.';

        // Handle certificate/trust errors specifically
        if (errorMessage.includes('certificate') || errorMessage.includes('trust') || errorMessage.includes('untrusted') || errorMessage.includes('denied')) {
          const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
          const currentUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}` : '';

          const fixInstructions = isMac
            ? `\n\n🔧 If "Remember this decision" is grayed out:\n1. Quit QZ Tray\n2. Run: rm -rf ~/Library/Application\\ Support/qz/auth/*\n3. Restart QZ Tray\n4. Check the box BEFORE clicking Allow`
            : `\n\n🔧 If "Remember this decision" is grayed out:\n1. Close QZ Tray\n2. Delete: %APPDATA%\\qz\\auth\\\n3. Restart QZ Tray\n4. Check the box BEFORE clicking Allow`;

          return {
            isConnected: false,
            error: `${errorMessage}\n\n🔒 ACTION REQUIRED:\n1. Click "Allow"\n2. ✅ CHECK "Remember this decision"\n3. Click "Allow" again${fixInstructions}`,
          };
        }

        throw connectError;
      }
    } catch (error: any) {
      console.error('[QZ Tray] Connection error:', error);
      return {
        isConnected: false,
        error: error.message || 'Failed to connect to QZ Tray. Ensure QZ Tray is running.',
      };
    } finally {
      // Clear the promise after a small delay to prevent immediate re-attempts if it failed
      setTimeout(() => {
        connectionPromise = null;
      }, 5000);
    }
  })();

  return connectionPromise;
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
    // Handle "Request blocked" error specifically
    if (error?.message?.includes('blocked') || error?.message?.includes('Request blocked')) {
      const currentUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
        : '';

      console.error('QZ Tray Request Blocked:', {
        message: 'Your site is blocked by QZ Tray. You need to add it to QZ Tray\'s allowed list.',
        url: currentUrl,
        instructions: 'Open QZ Tray → Right-click icon → Site Manager → Click + button → Add your site URL'
      });

      // Trigger event to show instructions
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qz-tray-request-blocked', {
          detail: { url: currentUrl }
        }));
      }
    }
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
 * Helper to create the optimized QZ Tray configuration for 70mm x 50mm thermal labels
 */
const getQZConfig = async (
  customSettings?: { paperWidth?: number; paperHeight?: number },
  printerName?: string
) => {
  if (typeof window === 'undefined' || typeof window.qz === 'undefined') return null;

  try {
    let targetPrinter = printerName;
    if (!targetPrinter) {
      targetPrinter = await window.qz.printers.getDefault();
    }

    if (!targetPrinter) {
      console.warn('[QZ Tray] No printer found');
      return null;
    }

    const printer = await window.qz.printers.find(targetPrinter);
    if (!printer) {
      console.warn(`[QZ Tray] Printer "${targetPrinter}" not found`);
      return null;
    }

    // Convert dots (at 203 DPI) to mm for more reliable thermal printing
    let width = 101.6; // 4 inches
    let height = 152.4; // 6 inches

    if (customSettings?.paperWidth && customSettings?.paperHeight) {
      width = customSettings.paperWidth * 0.125;
      height = customSettings.paperHeight * 0.125;
    }

    return window.qz.configs.create(printer, {
      size: { width, height },
      units: "mm",
      density: 203,
      reconnection: true,
      colorType: 'black-white',
      interpolation: 'nearest-neighbor'
    });
  } catch (err) {
    console.error('[QZ Config Error]', err);
    return null;
  }
};

/**
 * Generate ZPL code for barcode label
 * Optimized for 4x6 inch labels on TSC TE 244 (203 DPI) thermal printer
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
  } = options;

  // 4x6 inch label at 203 DPI (TSC TE 244):
  // Width: 4 inches * 203 DPI = 812 dots
  // Height: 6 inches * 203 DPI = 1218 dots
  const widthDots = 812;
  const heightDots = 1218;

  // ZPL Logic for 4x6 Inch Label (203 DPI)
  const zplData = [
    `^XA`,              // Start
    `^PW812`,           // 4 inch width
    `^LL1218`,          // 6 inch length
    `^CI28`,            // UTF-8 support

    // -- Header Section --
    // Box ID (Smaller font at top)
    `^FO50,50^A0N,35,35^FDBox ID: ${boxId}^FS`,

    // -- Details Section (Smaller Font) --
    // Spaced 60-70 dots apart to prevent overlap
    `^FO50,120^A0N,30,30^FDYarn: ${yarnName}^FS`,
    `^FO50,170^A0N,30,30^FDLot: ${lotNumber}^FS`,
    `^FO50,220^A0N,30,30^FDShade: ${shadeCode}^FS`,

    // -- Barcode Section --
    // ^BY2,2,100 -> Width=2 (Narrow), Ratio=2, Height=100 dots
    `^BY2,2,100`,

    // Positioned lower at Y=300 to clear all text
    // ^BC -> Code 128
    // N, 100, Y, N, N -> Normal, 100 Height, Print Text Below, No text above, No Check digit
    `^FO50,300^BCN,100,Y,N,N^FD${barcodeValue}^FS`,

    `^XZ`               // End
  ];

  return zplData.join('\n');
};

/**
 * Generate ZPL for multiple label printing (1-6 items per page)
 * Optimized for 4x6 inch labels on TSC TE 244 (203 DPI) thermal printer
 * Professional layout: Header (Product/Brand), Details List, Barcode, Footer
 * Dynamically stacks items based on labelsPerPage setting
 */
export const generateZPLDoubleLabel = (
  items: Array<{
    barcodeValue: string;
    boxId?: string;
    yarnName?: string;
    lotNumber?: string;
    shadeCode?: string;
    supplier?: string;
  } | null>,
  customSettings?: {
    paperWidth?: number;
    paperHeight?: number;
    labelsPerPage?: number;
    firstLabelTopMargin?: number;
    supplierFontSize?: number;
    detailsFontSize?: number;
    barcodeHeight?: number;
    supplierYPos?: number;
    boxIdYPos?: number;
    yarnYPos?: number;
    lotYPos?: number;
    shadeYPos?: number;
    barcodeYPos?: number;
    footerYPos?: number;
  }
): string => {
  // Default settings
  const settings = {
    paperWidth: customSettings?.paperWidth || 812,
    paperHeight: customSettings?.paperHeight || 1218,
    labelsPerPage: customSettings?.labelsPerPage || 2,
    firstLabelTopMargin: customSettings?.firstLabelTopMargin || 0,
    supplierFontSize: customSettings?.supplierFontSize || 30,
    detailsFontSize: customSettings?.detailsFontSize || 30,
    barcodeHeight: customSettings?.barcodeHeight || 100,
    supplierYPos: customSettings?.supplierYPos || 30,
    boxIdYPos: customSettings?.boxIdYPos || 80,
    yarnYPos: customSettings?.yarnYPos || 120,
    lotYPos: customSettings?.lotYPos || 160,
    shadeYPos: customSettings?.shadeYPos || 200,
    barcodeYPos: customSettings?.barcodeYPos || 260,
    footerYPos: customSettings?.footerYPos || 400,
  };

  // Helper: Generates ZPL for a single item at a specific Y position
  // yOffset = 0 for Top Label, 609 for Bottom Label
  const createLabelZpl = (
    product: {
      barcodeValue: string;
      boxId?: string;
      yarnName?: string;
      lotNumber?: string;
      shadeCode?: string;
      supplier?: string;
    } | null,
    yOffset: number
  ): string => {
    if (!product) return ''; // Handle case where we have an odd number of items

    const boxId = product.boxId || '';
    const yarnName = product.yarnName || '';
    const lotNumber = product.lotNumber || '';
    const shadeCode = product.shadeCode || '';
    const barcodeValue = product.barcodeValue || '';
    const supplier = product.supplier || 'YARN LABEL';

    return `
      ^FO20,${settings.supplierYPos + yOffset}^A0N,${settings.supplierFontSize},${settings.supplierFontSize}^FD${supplier}^FS
      ^FO20,${settings.boxIdYPos + yOffset}^A0N,${settings.detailsFontSize},${settings.detailsFontSize}^FDBox ID: ${boxId}^FS
      ^FO20,${settings.yarnYPos + yOffset}^A0N,${settings.detailsFontSize},${settings.detailsFontSize}^FDYarn: ${yarnName}^FS
      ^FO20,${settings.lotYPos + yOffset}^A0N,${settings.detailsFontSize},${settings.detailsFontSize}^FDLot: ${lotNumber}^FS
      ^FO20,${settings.shadeYPos + yOffset}^A0N,${settings.detailsFontSize},${settings.detailsFontSize}^FDShade: ${shadeCode}^FS
      ^BY2,2,${settings.barcodeHeight}
      ^FO40,${settings.barcodeYPos + yOffset}^BCN,${settings.barcodeHeight},Y,N,N^FD${barcodeValue}^FS
      ^FO600,${settings.footerYPos + yOffset}^A0N,20,20^FDMade in India^FS`;
  };

  // Calculate space per label based on labelsPerPage
  const spacePerLabel = Math.floor(settings.paperHeight / settings.labelsPerPage);

  const zplData = [
    `^XA`,              // Start ZPL
    `^PW${settings.paperWidth}`,           // Custom paper width
    `^LL${settings.paperHeight}`,          // Custom paper height
    `^CI28`,            // UTF-8 Encoding
  ];

  // Generate ZPL for each item
  for (let i = 0; i < items.length && i < settings.labelsPerPage; i++) {
    const item = items[i];
    if (!item) continue;

    // Calculate Y offset for this label
    // First label gets the top margin, others are evenly spaced
    const yOffset = i === 0
      ? settings.firstLabelTopMargin
      : (spacePerLabel * i);

    zplData.push(createLabelZpl(item, yOffset));
  }

  zplData.push(`^XZ`); // End ZPL

  return zplData.join('\n');
};

/**
 * Generate ZPL for a Rack Label
 * Works with both standalone and batched printing on 4x6 paper
 */
export const generateZPLRack = (
  rackCode: string,
  barcodeValue: string,
  options: {
    shelf?: number | string;
    floor?: number | string;
    zone?: string;
    labelWidth?: number;
    labelHeight?: number;
    xOffset?: number;
    yOffset?: number;
    zoneFontSize?: number;
    rackCodeFontSize?: number;
    detailsFontSize?: number;
    barcodeHeight?: number;
  } = {}
): string => {
  const {
    shelf,
    floor,
    zone,
    labelWidth = 812,
    labelHeight = 400,
    xOffset = 0,
    yOffset = 0,
    zoneFontSize = 25,
    rackCodeFontSize = 60,
    detailsFontSize = 25,
    barcodeHeight = 80
  } = options;

  const labelMargin = 20;
  const contentWidth = labelWidth - (labelMargin * 2);

  // For standalone printing, include ^XA/^XZ
  // For batched printing, these will be excluded
  const isStandalone = yOffset === 0 && xOffset === 0 && !options.labelWidth;

  let zpl = '';

  if (isStandalone) {
    zpl += `^XA\n`;
    zpl += `^PW${labelWidth}\n`;
    zpl += `^LL${labelHeight}\n`;
    zpl += `^CI28\n`;
  }

  let yPos = 20 + yOffset;
  const xPos = labelMargin + xOffset;

  // Zone Identifier
  const zoneLabel = zone === 'LT' ? 'LONG TERM STORAGE' : zone === 'ST' ? 'SHORT TERM STORAGE' : 'YARN STORAGE';
  zpl += `^FO${xPos},${yPos}^A0N,${zoneFontSize},${zoneFontSize}^FD${zoneLabel}^FS\n`;
  yPos += zoneFontSize + 10;

  // Large Rack Code
  zpl += `^FO${xPos},${yPos}^A0N,${rackCodeFontSize},${rackCodeFontSize}^FD${rackCode}^FS\n`;
  yPos += rackCodeFontSize + 10;

  // Details
  if (shelf !== undefined || floor !== undefined) {
    zpl += `^FO${xPos},${yPos}^A0N,${detailsFontSize},${detailsFontSize}^FDShelf: ${shelf || '-'}  |  Floor: ${floor || '-'}^FS\n`;
    yPos += detailsFontSize + 10;
  }

  // Barcode (CODE128)
  zpl += `^BY2,2,${barcodeHeight}\n`;
  zpl += `^FO${xPos},${yPos}^BCN,${barcodeHeight},Y,N,N^FD${barcodeValue}^FS\n`;

  if (isStandalone) {
    zpl += `^XZ\n`;
  }

  return zpl;
};

/**
 * Generate ZPL for a Cone Label (with QR Code)
 * Works with both standalone and batched printing on 4x6 paper
 */
export const generateZPLCone = (
  barcodeValue: string,
  options: {
    yarnName?: string;
    supplierName?: string;
    poNumber?: string;
    lotNumber?: string;
    shadeCode?: string;
    weight?: number;
    labelWidth?: number;
    labelHeight?: number;
    xOffset?: number;
    yOffset?: number;
    qrCodeSize?: number;
    titleFontSize?: number;
    detailsFontSize?: number;
  } = {}
): string => {
  const {
    yarnName,
    supplierName,
    poNumber,
    lotNumber,
    shadeCode,
    weight,
    labelWidth = 812,
    labelHeight = 400,
    xOffset = 0,
    yOffset = 0,
    qrCodeSize = 5,
    titleFontSize = 25,
    detailsFontSize = 20
  } = options;

  const labelMargin = 15; // Slightly reduced margin for small labels
  const isSmallSideBySide = labelHeight < 300 && labelWidth > 350;

  /** Wrap long yarn name into lines (break at space when possible). Max ~26 chars per line for small labels. */
  const wrapText = (text: string, maxCharsPerLine: number): string[] => {
    if (!text || text.length <= maxCharsPerLine) return text ? [text] : [];
    const lines: string[] = [];
    let remaining = text.trim();
    while (remaining.length > 0) {
      if (remaining.length <= maxCharsPerLine) {
        lines.push(remaining);
        break;
      }
      const chunk = remaining.substring(0, maxCharsPerLine);
      const lastSpace = chunk.lastIndexOf(' ');
      const breakAt = lastSpace > 0 ? lastSpace : maxCharsPerLine;
      lines.push(remaining.substring(0, breakAt).trim());
      remaining = remaining.substring(breakAt).trim();
    }
    return lines;
  };

  const isStandalone = yOffset === 0 && xOffset === 0 && !options.labelWidth;

  let zpl = '';

  if (isStandalone) {
    zpl += `^XA\n`;
    zpl += `^PW${labelWidth}\n`;
    zpl += `^LL${labelHeight}\n`;
    zpl += `^CI28\n`;
  }

  if (isSmallSideBySide) {
    // SIDE-BY-SIDE LAYOUT (e.g. 50x25mm) - same field order as browser test print
    const dataWidth = Math.floor(labelWidth * 0.65) - labelMargin;
    const qrSectionX = xOffset + dataWidth + labelMargin;
    const qrWidth = qrCodeSize * 30;
    let yPos = 15 + yOffset;
    const xPos = labelMargin + xOffset;
    const detailsFont = Math.min(detailsFontSize, 18);
    const lineHeight = detailsFont + 4;
    const maxYarnChars = Math.floor(dataWidth / (detailsFont * 0.55));

    // 1. Yarn Name (title)
    if (yarnName) {
      const nameLines = wrapText(yarnName, maxYarnChars);
      nameLines.slice(0, 4).forEach((line) => {
        zpl += `^FO${xPos},${yPos}^A0N,${detailsFont + 1},${detailsFont + 1}^FD${line}^FS\n`;
        yPos += lineHeight - 1;
      });
    }
    // 2. Supplier  3. PO  4. Lot  5. Shade (same order as browser)
    zpl += `^FO${xPos},${yPos}^A0N,${detailsFont - 1},${detailsFont - 1}^FDSupplier: ${(supplierName || '-').substring(0, maxYarnChars)}^FS\n`;
    yPos += lineHeight - 1;
    zpl += `^FO${xPos},${yPos}^A0N,${detailsFont - 1},${detailsFont - 1}^FDPO: ${poNumber || '-'}^FS\n`;
    yPos += lineHeight - 1;
    zpl += `^FO${xPos},${yPos}^A0N,${detailsFont},${detailsFont}^FDLot: ${lotNumber || '-'}^FS\n`;
    yPos += lineHeight;
    zpl += `^FO${xPos},${yPos}^A0N,${detailsFont},${detailsFont}^FDShade: ${shadeCode || '-'}^FS\n`;
    yPos += lineHeight;
    const qrYPos = yOffset + Math.max(10, Math.floor((labelHeight - qrWidth) / 2));
    zpl += `^FO${qrSectionX},${qrYPos}^BQN,2,${qrCodeSize}^FDQA,${barcodeValue}^FS\n`;
  } else {
    // LAYOUT MATCHING BROWSER TEST PRINT: data left (~65%), QR right (~33%)
    const dataWidth = Math.floor(labelWidth * 0.65) - labelMargin;
    const qrSectionX = xOffset + dataWidth + labelMargin;
    const qrWidth = qrCodeSize * 30;
    const yarnNameFontH = detailsFontSize + 2;
    const lineHeight = yarnNameFontH + 3;
    const maxYarnCharsPerLine = labelWidth < 300 ? 22 : labelWidth < 450 ? 26 : 32;

    let yPos = 5 + yOffset;
    const xPos = labelMargin + xOffset;

    // 1. Yarn Name (title) - same as browser .title
    if (yarnName) {
      const nameLines = wrapText(yarnName, maxYarnCharsPerLine);
      for (const line of nameLines) {
        zpl += `^FO${xPos},${yPos}^A0N,${titleFontSize},${titleFontSize}^FD${line}^FS\n`;
        yPos += lineHeight;
      }
    }

    // 2. Supplier - same order as browser
    zpl += `^FO${xPos},${yPos}^A0N,${detailsFontSize},${detailsFontSize}^FDSupplier: ${(supplierName || '-').substring(0, maxYarnCharsPerLine)}^FS\n`;
    yPos += lineHeight;

    // 3. PO
    zpl += `^FO${xPos},${yPos}^A0N,${detailsFontSize},${detailsFontSize}^FDPO: ${poNumber || '-'}^FS\n`;
    yPos += lineHeight;

    // 4. Lot
    zpl += `^FO${xPos},${yPos}^A0N,${detailsFontSize},${detailsFontSize}^FDLot: ${lotNumber || '-'}^FS\n`;
    yPos += lineHeight;

    // 5. Shade
    zpl += `^FO${xPos},${yPos}^A0N,${detailsFontSize},${detailsFontSize}^FDShade: ${shadeCode || '-'}^FS\n`;
    yPos += lineHeight;

    // 6. QR Code on the right (browser .qr width 33%)
    const qrYPos = yOffset + Math.max(10, Math.floor((labelHeight - qrWidth) / 2));
    zpl += `^FO${qrSectionX},${qrYPos}^BQN,2,${qrCodeSize}^FDQA,${barcodeValue}^FS\n`;
  }

  if (isStandalone) {
    zpl += `^XZ\n`;
  }

  return zpl;
};

/**
 * Print barcode using ZPL - HTML file approach (simple and direct)
 * This matches the exact approach used in test-qz-tray.html
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
    // Ensure script is loaded (like HTML file)
    if (typeof window === 'undefined' || typeof window.qz === 'undefined') {
      if (!isQZLoaded()) {
        await loadQZScript();
      }
    }

    if (typeof window === 'undefined' || typeof window.qz === 'undefined') {
      return {
        success: false,
        error: 'QZ Tray script not loaded',
      };
    }

    // Connect if not connected (simple connection like HTML file)
    if (!window.qz.websocket.isActive()) {
      // Simple connection - no timeout, no retry logic, just like HTML file
      await window.qz.websocket.connect();
    }

    if (!window.qz.websocket.isActive()) {
      return {
        success: false,
        error: 'Not connected to QZ Tray',
      };
    }

    // Get default printer name (like HTML file)
    let printerName = options.printerName;
    if (!printerName) {
      printerName = await window.qz.printers.getDefault();
      if (!printerName) {
        return {
          success: false,
          error: 'No default printer found. Please set a default printer in your OS settings.',
        };
      }
    }

    // Find printer object (like HTML file)
    const printer = await window.qz.printers.find(printerName);
    if (!printer) {
      return {
        success: false,
        error: `Printer "${printerName}" not found`,
      };
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

    // Create print config for raw ZPL printing
    const config = getQZConfig(printer);
    if (!config) throw new Error("Could not create QZ configuration");

    // Print (ZPL must be passed as an array) - exactly like HTML file
    const copies = options.copies || 1;
    for (let i = 0; i < copies; i++) {
      await window.qz.print(config, [zpl]);
    }

    return { success: true };
  } catch (error: any) {
    // Handle "Request blocked" error specifically
    if (error?.message?.includes('blocked') || error?.message?.includes('Request blocked')) {
      const currentUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
        : '';

      console.error('QZ Tray Request Blocked:', {
        message: 'Your site is blocked by QZ Tray. You need to add it to QZ Tray\'s allowed list.',
        url: currentUrl,
        instructions: 'Open QZ Tray → Right-click icon → Site Manager → Click + button → Add your site URL'
      });

      // Trigger event to show instructions
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qz-tray-request-blocked', {
          detail: { url: currentUrl }
        }));
      }

      return {
        success: false,
        error: `Request blocked by QZ Tray. Please add "${currentUrl}" to QZ Tray's allowed sites:\n\n1. Right-click QZ Tray icon (menu bar/tray)\n2. Click "Site Manager"\n3. Click the "+" button\n4. Add your site URL: ${currentUrl}\n5. Click "Close" and try again`,
      };
    }

    console.error('Error printing barcode:', error);
    return {
      success: false,
      error: error?.message || 'Failed to print barcode',
    };
  }
};

/**
 * Print multiple barcodes sequentially - HTML file approach
 * Connects once, then prints all barcodes
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

  try {
    // Connect once at the start (like HTML file approach)
    if (typeof window === 'undefined' || typeof window.qz === 'undefined') {
      if (!isQZLoaded()) {
        await loadQZScript();
      }
    }

    if (typeof window === 'undefined' || typeof window.qz === 'undefined') {
      return {
        success: false,
        printed: 0,
        errors: ['QZ Tray script not loaded'],
      };
    }

    // Connect if not connected (simple connection like HTML file)
    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
    }

    if (!window.qz.websocket.isActive()) {
      return {
        success: false,
        printed: 0,
        errors: ['Not connected to QZ Tray'],
      };
    }

    // Get printer once
    let printerName = options.printerName;
    if (!printerName) {
      printerName = await window.qz.printers.getDefault();
      if (!printerName) {
        return {
          success: false,
          printed: 0,
          errors: ['No default printer found'],
        };
      }
    }

    const printer = await window.qz.printers.find(printerName);
    if (!printer) {
      return {
        success: false,
        printed: 0,
        errors: [`Printer "${printerName}" not found`],
      };
    }

    const config = getQZConfig(printer);
    if (!config) throw new Error("Could not create QZ configuration");

    // BATCH PRINTING: Combine all ZPL into a single array and send in one qz.print call
    // This minimizes security prompts and ensures all labels are sent at once
    const allLabels: string[] = [];

    for (const barcode of barcodes) {
      const zpl = generateZPLBarcode(barcode.barcodeValue, {
        boxId: barcode.boxId,
        supplier: barcode.supplier,
        yarnName: barcode.yarnName,
        shadeCode: barcode.shadeCode,
        yarnColour: barcode.yarnColour,
        shadeName: barcode.shadeName,
        lotNumber: barcode.lotNumber,
      });
      allLabels.push(zpl);
    }

    if (allLabels.length > 0) {
      await window.qz.print(config, allLabels);
      printed = allLabels.length;
    }

    return {
      success: true,
      printed,
      errors: [],
    };
  } catch (error: any) {
    return {
      success: false,
      printed,
      errors: [...errors, error?.message || 'Failed to print barcodes'],
    };
  }
};

/**
 * Print multiple barcodes using double-label format (2 items per 4x6 label)
 * Automatically pairs items and prints them vertically stacked
 * Saves paper by printing 2 items per label
 */
export const printDoubleBarcodes = async (
  barcodes: Array<{
    barcodeValue: string;
    boxId?: string;
    yarnName?: string;
    shadeCode?: string;
    lotNumber?: string;
    supplier?: string;
  }>,
  options: {
    printerName?: string;
    customSettings?: {
      paperWidth?: number;
      paperHeight?: number;
      labelsPerPage?: number;
      firstLabelTopMargin?: number;
      supplierFontSize?: number;
      detailsFontSize?: number;
      barcodeHeight?: number;
      supplierYPos?: number;
      boxIdYPos?: number;
      yarnYPos?: number;
      lotYPos?: number;
      shadeYPos?: number;
      barcodeYPos?: number;
      footerYPos?: number;
    };
  } = {}
): Promise<{ success: boolean; printed: number; errors: string[] }> => {
  const errors: string[] = [];
  let printed = 0;

  try {
    // Connect once at the start
    if (typeof window === 'undefined' || typeof window.qz === 'undefined') {
      if (!isQZLoaded()) {
        await loadQZScript();
      }
    }

    if (typeof window === 'undefined' || typeof window.qz === 'undefined') {
      return {
        success: false,
        printed: 0,
        errors: ['QZ Tray script not loaded'],
      };
    }

    // Connect if not connected
    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
    }

    if (!window.qz.websocket.isActive()) {
      return {
        success: false,
        printed: 0,
        errors: ['Not connected to QZ Tray'],
      };
    }

    // Get printer once
    const config = await getQZConfig(options.customSettings, options.printerName);
    if (!config) throw new Error("Could not create QZ configuration. Please check your printer connection.");

    // BATCH PRINTING: Group items based on labelsPerPage setting
    const allLabels: string[] = [];
    const labelsPerPage = options.customSettings?.labelsPerPage || 2;

    // Process items in groups
    for (let i = 0; i < barcodes.length; i += labelsPerPage) {
      // Collect items for this page
      const pageItems: Array<{
        barcodeValue: string;
        boxId?: string;
        yarnName?: string;
        shadeCode?: string;
        lotNumber?: string;
        supplier?: string;
      }> = [];

      for (let j = 0; j < labelsPerPage && (i + j) < barcodes.length; j++) {
        const barcode = barcodes[i + j];
        pageItems.push({
          barcodeValue: barcode.barcodeValue,
          boxId: barcode.boxId,
          yarnName: barcode.yarnName,
          shadeCode: barcode.shadeCode,
          lotNumber: barcode.lotNumber,
          supplier: barcode.supplier,
        });
      }

      const zpl = generateZPLDoubleLabel(pageItems, options.customSettings);
      allLabels.push(zpl);
    }

    if (allLabels.length > 0) {
      await window.qz.print(config, allLabels);
      printed = barcodes.length; // Count actual items printed, not label sheets
    }

    return {
      success: true,
      printed,
      errors: [],
    };
  } catch (error: any) {
    return {
      success: false,
      printed,
      errors: [...errors, error?.message || 'Failed to print double barcodes'],
    };
  }
};

/**
 * Print Rack Barcodes using QZ Tray
 * Supports custom settings for paper size, labels per page, columns, cut lines, etc.
 */
export const printRacks = async (
  racks: Array<{
    rackCode: string;
    barcode: string;
    shelf?: number | string;
    floor?: number | string;
    zone?: string;
  }>,
  options: {
    printerName?: string;
    customSettings?: {
      paperWidth?: number;
      paperHeight?: number;
      labelsPerPage?: number;
      columnsPerRow?: number;
      firstLabelTopMargin?: number;
      showCutLines?: boolean;
      zoneFontSize?: number;
      rackCodeFontSize?: number;
      detailsFontSize?: number;
      barcodeHeight?: number;
    };
  } = {}
): Promise<{ success: boolean; printed: number; error?: string }> => {
  try {
    const connection = await connectQZ();
    if (!connection.isConnected) throw new Error(connection.error);

    const config = await getQZConfig(options.customSettings, options.printerName);
    if (!config) throw new Error("Could not create QZ configuration. Please check your printer connection.");

    if (options.customSettings) {
      const labels: string[] = [];
      const paperWidth = options.customSettings.paperWidth || 812;
      const paperHeight = options.customSettings.paperHeight || 1218;
      const firstLabelTopMargin = options.customSettings.firstLabelTopMargin || 0;
      const labelsPerPage = options.customSettings.labelsPerPage || 1;
      const columnsPerRow = options.customSettings.columnsPerRow || 1;
      const showCutLines = options.customSettings.showCutLines !== false;

      const labelWidth = Math.floor(paperWidth / columnsPerRow);
      const rowsPerPage = Math.ceil(labelsPerPage / columnsPerRow);
      const labelHeight = Math.floor(paperHeight / rowsPerPage);

      const zoneFontSize = options.customSettings.zoneFontSize || 20;
      const rackCodeFontSize = options.customSettings.rackCodeFontSize || 50;
      const detailsFontSize = options.customSettings.detailsFontSize || 20;
      const barcodeHeight = options.customSettings.barcodeHeight || 70;

      const labelsPerSheet = rowsPerPage * columnsPerRow;

      for (let i = 0; i < racks.length; i += labelsPerSheet) {
        let zpl = `^XA\n^PW${paperWidth}\n^LL${paperHeight}\n^CI28\n`;

        for (let j = 0; j < labelsPerSheet && (i + j) < racks.length; j++) {
          const rack = racks[i + j];
          const row = Math.floor(j / columnsPerRow);
          const col = j % columnsPerRow;
          const xOffset = col * labelWidth;
          const yOffset = row === 0 ? firstLabelTopMargin : (row * labelHeight);

          zpl += generateZPLRack(rack.rackCode, rack.barcode, {
            shelf: rack.shelf,
            floor: rack.floor,
            zone: rack.zone,
            labelWidth: labelWidth,
            labelHeight: labelHeight,
            xOffset: xOffset,
            yOffset: yOffset,
            zoneFontSize,
            rackCodeFontSize,
            detailsFontSize,
            barcodeHeight
          });
        }

        if (showCutLines) {
          for (let row = 1; row < rowsPerPage; row++) {
            zpl += `^FO0,${row * labelHeight}^GB${paperWidth},1,1^FS\n`;
          }
          for (let col = 1; col < columnsPerRow; col++) {
            zpl += `^FO${col * labelWidth},0^GB1,${paperHeight},1^FS\n`;
          }
        }

        zpl += `^XZ\n`;
        labels.push(zpl);
      }

      await window.qz.print(config, labels);
      return { success: true, printed: racks.length };
    } else {
      const labels = racks.map(rack =>
        generateZPLRack(rack.rackCode, rack.barcode, {
          shelf: rack.shelf,
          floor: rack.floor,
          zone: rack.zone
        })
      );
      await window.qz.print(config, labels);
      return { success: true, printed: labels.length };
    }
  } catch (error: any) {
    console.error('[QZ Tray] Rack print error:', error);
    return { success: false, printed: 0, error: error.message };
  }
};

/**
 * Print Cone QR Labels using QZ Tray
 * Supports custom settings for paper size, labels per page, columns, cut lines, etc.
 */
export const printCones = async (
  cones: Array<{
    barcode: string;
    yarnName?: string;
    supplierName?: string;
    poNumber?: string;
    lotNumber?: string;
    shadeCode?: string;
    weight?: number;
  }>,
  options: {
    printerName?: string;
    customSettings?: {
      paperWidth?: number;
      paperHeight?: number;
      labelsPerPage?: number;
      columnsPerRow?: number;
      firstLabelTopMargin?: number;
      showCutLines?: boolean;
      qrCodeSize?: number;
      titleFontSize?: number;
      detailsFontSize?: number;
    };
  } = {}
): Promise<{ success: boolean; printed: number; error?: string }> => {
  try {
    const connection = await connectQZ();
    if (!connection.isConnected) throw new Error(connection.error);

    const config = await getQZConfig(options.customSettings, options.printerName);
    if (!config) throw new Error("Could not create QZ configuration. Please check your printer connection.");

    if (options.customSettings) {
      const labels: string[] = [];
      const paperWidth = options.customSettings.paperWidth || 812;
      const paperHeight = options.customSettings.paperHeight || 1218;
      const firstLabelTopMargin = options.customSettings.firstLabelTopMargin || 0;
      const labelsPerPage = options.customSettings.labelsPerPage || 1;
      const columnsPerRow = options.customSettings.columnsPerRow || 1;
      const showCutLines = options.customSettings.showCutLines !== false;

      const labelWidth = Math.floor(paperWidth / columnsPerRow);
      const rowsPerPage = Math.ceil(labelsPerPage / columnsPerRow);
      const labelHeight = Math.floor(paperHeight / rowsPerPage);

      const qrCodeSize = options.customSettings.qrCodeSize || 5;
      const titleFontSize = options.customSettings.titleFontSize || 25;
      const detailsFontSize = options.customSettings.detailsFontSize || 20;

      const labelsPerSheet = rowsPerPage * columnsPerRow;

      for (let i = 0; i < cones.length; i += labelsPerSheet) {
        let zpl = `^XA\n^PW${paperWidth}\n^LL${paperHeight}\n^CI28\n`;

        for (let j = 0; j < labelsPerSheet && (i + j) < cones.length; j++) {
          const cone = cones[i + j];
          const row = Math.floor(j / columnsPerRow);
          const col = j % columnsPerRow;
          const xOffset = col * labelWidth;
          const yOffset = row === 0 ? firstLabelTopMargin : (row * labelHeight);

          zpl += generateZPLCone(cone.barcode, {
            yarnName: cone.yarnName,
            supplierName: cone.supplierName,
            poNumber: cone.poNumber,
            lotNumber: cone.lotNumber,
            shadeCode: cone.shadeCode,
            weight: cone.weight,
            labelWidth,
            labelHeight,
            xOffset,
            yOffset,
            qrCodeSize,
            titleFontSize,
            detailsFontSize
          });
        }

        if (showCutLines) {
          for (let row = 1; row < rowsPerPage; row++) {
            zpl += `^FO0,${row * labelHeight}^GB${paperWidth},1,1^FS\n`;
          }
          for (let col = 1; col < columnsPerRow; col++) {
            zpl += `^FO${col * labelWidth},0^GB1,${paperHeight},1^FS\n`;
          }
        }

        zpl += `^XZ\n`;
        labels.push(zpl);
      }

      await window.qz.print(config, labels);
      return { success: true, printed: cones.length };
    } else {
      const labels = cones.map(cone =>
        generateZPLCone(cone.barcode, {
          yarnName: cone.yarnName,
          supplierName: cone.supplierName,
          poNumber: cone.poNumber,
          lotNumber: cone.lotNumber,
          shadeCode: cone.shadeCode,
          weight: cone.weight
        })
      );
      await window.qz.print(config, labels);
      return { success: true, printed: labels.length };
    }
  } catch (error: any) {
    console.error('[QZ Tray] Cone print error:', error);
    return { success: false, printed: 0, error: error.message };
  }
};
