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

          setTimeout(() => { connectionPromise = null; }, 3000);
          return {
            isConnected: false,
            error: `${errorMessage}\n\n🔒 ACTION REQUIRED:\n1. Click "Allow"\n2. ✅ CHECK "Remember this decision"\n3. Click "Allow" again${fixInstructions}`,
          };
        }

        throw connectError;
      }
    } catch (error: any) {
      console.error('[QZ Tray] Connection error:', error);
      // Clear promise on failure so user can retry after a delay
      setTimeout(() => {
        connectionPromise = null;
      }, 3000);
      return {
        isConnected: false,
        error: error.message || 'Failed to connect to QZ Tray. Ensure QZ Tray is running.',
      };
    }
    // On success, keep connectionPromise so future connectQZ() reuse the same resolved connection
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
 * Resolve effective paper dimensions for ZPL/config from orientation.
 * Horizontal = use label in landscape (swap when height > width so 50x70 becomes 70x50).
 */
const effectivePaperSize = (
  paperWidth: number,
  paperHeight: number,
  orientation?: 'horizontal' | 'vertical'
): { width: number; height: number } => {
  // Return dimensions as-is; orientation is handled by ZPL rotation within labels
  return { width: paperWidth, height: paperHeight };
};

/**
 * Helper to create the optimized QZ Tray configuration for thermal labels.
 * Respects orientation: horizontal swaps width/height so 50x70 prints as 70x50.
 */
const getQZConfig = async (
  customSettings?: { paperWidth?: number; paperHeight?: number; orientation?: 'horizontal' | 'vertical' },
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

    if (customSettings?.paperWidth != null && customSettings?.paperHeight != null) {
      const pw = customSettings.paperWidth;
      const ph = customSettings.paperHeight;
      const effective = effectivePaperSize(pw, ph, customSettings.orientation);
      width = effective.width * 0.125;
      height = effective.height * 0.125;
    }

    return window.qz.configs.create(printer, {
      size: { width, height },
      units: "mm",
      density: 203,
      reconnection: true,
      colorType: 'black-white',
      interpolation: 'nearest-neighbor',
      // Send ZPL/raw directly to printer; required when driver doesn't support raw (e.g. macOS/Linux)
      forceRaw: true,
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
    `^FO50,50^A0N,22,22^FDBox ID: ${boxId}^FS`,

    // -- Details Section (Smaller Font) --
    // Spaced 60-70 dots apart to prevent overlap
    `^FO50,120^A0N,22,22^FDYarn: ${yarnName}^FS`,
    `^FO50,170^A0N,22,22^FDLot: ${lotNumber}^FS`,
    `^FO50,220^A0N,22,22^FDShade: ${shadeCode}^FS`,

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
    boxIdFontSize?: number;
    yarnFontSize?: number;
    shadeLotFontSize?: number;
    barcodeHeight?: number;
    barcodeWidth?: number;
    qrCodeSize?: number;
    orientation?: 'horizontal' | 'vertical';
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
    supplierFontSize: customSettings?.supplierFontSize || 20,
    detailsFontSize: customSettings?.detailsFontSize || 20,
    boxIdFontSize: customSettings?.boxIdFontSize || 20,
    yarnFontSize: customSettings?.yarnFontSize || 20,
    shadeLotFontSize: customSettings?.shadeLotFontSize || 20,
    barcodeHeight: customSettings?.barcodeHeight || 100,
    barcodeWidth: Math.round(Number(customSettings?.barcodeWidth) || 3),
    qrCodeSize: customSettings?.qrCodeSize || 5,
    orientation: customSettings?.orientation || 'horizontal',
    supplierYPos: customSettings?.supplierYPos || 30,
    boxIdYPos: customSettings?.boxIdYPos || 80,
    yarnYPos: customSettings?.yarnYPos || 120,
    lotYPos: customSettings?.lotYPos || 160,
    shadeYPos: customSettings?.shadeYPos || 160, // Shared with Lot in same row
    barcodeYPos: customSettings?.barcodeYPos || 260,
    footerYPos: customSettings?.footerYPos || 400,
  };

  // Calculate space per label based on labelsPerPage
  const spacePerLabel = Math.floor(settings.paperHeight / settings.labelsPerPage);

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

    // Check for small label (e.g. 50mm width ≈ 400 dots)
    if (settings.paperWidth < 500) {
      if (settings.orientation === 'vertical') {
        const rowLength = spacePerLabel;
        let bWidth = settings.barcodeWidth;
        const getBcW = (w: number) => (barcodeValue.length + 3) * 11 * w;
        while (bWidth > 1 && getBcW(bWidth) > rowLength) {
          bWidth--;
        }
        const bcFullW = getBcW(bWidth);
        const bcMargin = Math.max(0, (rowLength - bcFullW) / 2);

        let curX = 40; // Top margin
        const step = 45;

        return `
          ^FO${curX},${yOffset}^A0R,${settings.boxIdFontSize},${settings.boxIdFontSize}^FB${rowLength},1,0,C^FDBox ID: ${boxId}^FS
          ^FO${curX + step},${yOffset}^A0R,${settings.supplierFontSize},${settings.supplierFontSize}^FB${rowLength},2,0,C^FD${supplier}^FS
          ^FO${curX + step * 2 + 10},${yOffset}^A0R,${settings.yarnFontSize},${settings.yarnFontSize}^FB${rowLength},2,0,C^FDYarn: ${yarnName}^FS
          ^FO${curX + step * 3 + 20},${yOffset}^A0R,${settings.shadeLotFontSize},${settings.shadeLotFontSize}^FB${rowLength},1,0,C^FDL: ${lotNumber}^FS
          ^FO${curX + step * 4 + 20},${yOffset}^A0R,${settings.shadeLotFontSize},${settings.shadeLotFontSize}^FB${rowLength},1,0,C^FDS: ${shadeCode}^FS
          ^BY${bWidth},2,${settings.barcodeHeight}
          ^FO${settings.paperWidth - settings.barcodeHeight - 30},${yOffset + bcMargin}^BCR,${settings.barcodeHeight},N,N,N^FD${barcodeValue}^FS`;
      }

      // Small Label Layout (Horizontal/Normal orientation)
      const contentWidth = settings.paperWidth - 40;
      let bWidth = settings.barcodeWidth;
      const getBcW = (w: number) => (barcodeValue.length + 3) * 11 * w;
      while (bWidth > 1 && getBcW(bWidth) > contentWidth) {
        bWidth--;
      }
      const bcFullW = getBcW(bWidth);
      const bcX = 20 + Math.max(0, (contentWidth - bcFullW) / 2);
      let curY = yOffset + 30;
      const lineH = settings.shadeLotFontSize + 8;

      return `
        ^FO20,${curY}^A0N,${settings.boxIdFontSize},${settings.boxIdFontSize}^FB${contentWidth},1,0,L^FDBox ID: ${boxId}^FS
        ^FO20,${curY + 40}^A0N,${settings.supplierFontSize},${settings.supplierFontSize}^FB${contentWidth},2,0,L^FD${supplier}^FS
        ^FO20,${curY + 90}^A0N,${settings.yarnFontSize},${settings.yarnFontSize}^FB${contentWidth},2,0,L^FDYarn: ${yarnName}^FS
        ^FO20,${curY + 140}^A0N,${settings.shadeLotFontSize},${settings.shadeLotFontSize}^FB${contentWidth},1,0,L^FDL: ${lotNumber}^FS
        ^FO20,${curY + 140 + lineH}^A0N,${settings.shadeLotFontSize},${settings.shadeLotFontSize}^FB${contentWidth},1,0,L^FDS: ${shadeCode}^FS
        ^BY${bWidth},2,${settings.barcodeHeight}
        ^FO${bcX},${yOffset + settings.paperHeight - settings.barcodeHeight - 30}^BCN,${settings.barcodeHeight},N,N,N^FD${barcodeValue}^FS`;
    }

    const rowLength = settings.orientation === 'vertical' ? spacePerLabel : settings.paperWidth;
    const barcodeWidth = settings.barcodeWidth;
    const barcodeFullWidth = (barcodeValue.length + 3) * 11 * barcodeWidth;
    const barcodeMargin = Math.max(0, (rowLength - barcodeFullWidth) / 2);

    if (settings.orientation === 'vertical') {
      return `
          ^FO${settings.supplierYPos},${yOffset}^A0R,${settings.supplierFontSize},${settings.supplierFontSize}^FB${rowLength},1,0,L^FD${supplier}^FS
          ^FO${settings.boxIdYPos},${yOffset}^A0R,${settings.boxIdFontSize},${settings.boxIdFontSize}^FB${rowLength},1,0,L^FDBox ID: ${boxId}^FS
          ^FO${settings.yarnYPos},${yOffset}^A0R,${settings.detailsFontSize},${settings.detailsFontSize}^FB${rowLength},1,0,L^FDYarn: ${yarnName}^FS
          ^FO${settings.lotYPos},${yOffset}^A0R,${settings.detailsFontSize},${settings.detailsFontSize}^FB${rowLength},1,0,L^FDLot: ${lotNumber}^FS
          ^FO${settings.shadeYPos},${yOffset}^A0R,${settings.detailsFontSize},${settings.detailsFontSize}^FB${rowLength},1,0,L^FDShade: ${shadeCode}^FS
          ^BY${barcodeWidth},2,${settings.barcodeHeight}
          ^FO${settings.barcodeYPos},${yOffset + barcodeMargin}^BCR,${settings.barcodeHeight},Y,N,N^FD${barcodeValue}^FS`;
    }

    return `
        ^FO0,${settings.supplierYPos + yOffset}^A0N,${settings.supplierFontSize},${settings.supplierFontSize}^FB${rowLength},1,0,L^FD${supplier}^FS
        ^FO0,${settings.boxIdYPos + yOffset}^A0N,${settings.boxIdFontSize},${settings.boxIdFontSize}^FB${rowLength},1,0,L^FDBox ID: ${boxId}^FS
        ^FO0,${settings.yarnYPos + yOffset}^A0N,${settings.detailsFontSize},${settings.detailsFontSize}^FB${rowLength},1,0,L^FDYarn: ${yarnName}^FS
        ^FO0,${settings.lotYPos + yOffset}^A0N,${settings.detailsFontSize},${settings.detailsFontSize}^FB${rowLength},1,0,L^FDLot: ${lotNumber}^FS
        ^FO0,${settings.shadeYPos + yOffset}^A0N,${settings.detailsFontSize},${settings.detailsFontSize}^FB${rowLength},1,0,L^FDShade: ${shadeCode}^FS
        ^BY${barcodeWidth},2,${settings.barcodeHeight}
        ^FO${barcodeMargin},${settings.barcodeYPos + yOffset}^BCN,${settings.barcodeHeight},Y,N,N^FD${barcodeValue}^FS`;
  };

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
    barcodeWidth?: number;
    orientation?: 'horizontal' | 'vertical';
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
    zoneFontSize = 30,
    rackCodeFontSize = 80,
    detailsFontSize = 40,
    barcodeHeight = 80,
    barcodeWidth = 2,
    orientation = 'horizontal'
  } = options;

  const labelMargin = 20;
  const contentWidth = labelWidth - (labelMargin * 2);

  // For standalone printing, include ^XA/^XZ
  // For batched printing, these will be excluded
  const isStandalone = yOffset === 0 && xOffset === 0 && !options.labelWidth;

  const isVertical = orientation === 'vertical';
  const rotation = isVertical ? 'R' : 'N'; // R = 90 degree rotation for vertical labels

  let zpl = '';

  if (isStandalone) {
    zpl += `^XA\n`;
    zpl += `^PW${labelWidth}\n`;
    zpl += `^LL${labelHeight}\n`;
    zpl += `^CI28\n`;
  }

  const contentHeight = labelHeight - (labelMargin * 2);

  // SMALL NARROW LABEL (e.g. 50x70mm)
  if (labelWidth < 500) {
    if (orientation === 'vertical') {
      // VERTICAL LANES (Rotated 90 Deg)
      const rowLen = labelHeight - (labelMargin * 2);
      const bWidth = barcodeWidth;
      const bcFullW = (barcodeValue.length + 3) * 11 * bWidth;
      const bcMargin = Math.max(0, (rowLen - bcFullW) / 2);

      let curX = 50; // Top margin
      const step = 50;

      zpl += `^FO${curX},${yOffset + labelMargin}^A0R,${rackCodeFontSize},${rackCodeFontSize}^FB${rowLen},1,0,C^FD${rackCode}^FS\n`;
      zpl += `^FO${curX + step},${yOffset + labelMargin}^A0R,${detailsFontSize},${detailsFontSize}^FB${rowLen},1,0,C^FDShelf: ${shelf || '-'} | Floor: ${floor || '-'}^FS\n`;
      zpl += `^BY${bWidth},2,${barcodeHeight}\n`;
      zpl += `^FO${labelWidth - barcodeHeight - 30},${yOffset + labelMargin + bcMargin}^BCR,${barcodeHeight},N,N,N^FD${barcodeValue}^FS\n`;

      if (isStandalone) zpl += `^XZ\n`;
      return zpl;
    }

    // Small Horizontal Layout
    const contentWidth = labelWidth - (labelMargin * 2);
    let curY = yOffset + 30; // Reduced top margin

    zpl += `^FO${labelMargin},${curY}^A0N,${rackCodeFontSize},${rackCodeFontSize}^FB${contentWidth},1,0,C^FD${rackCode}^FS\n`;
    zpl += `^FO${labelMargin},${curY + 60}^A0N,${detailsFontSize},${detailsFontSize}^FB${contentWidth},1,0,C^FDShelf: ${shelf || '-'} | Floor: ${floor || '-'}^FS\n`;
    zpl += `^BY${barcodeWidth},2,${barcodeHeight}\n`;
    zpl += `^FO${Math.max(0, (labelWidth - (barcodeValue.length + 3) * 11 * barcodeWidth) / 2)},${yOffset + labelHeight - barcodeHeight - 30}^BCN,${barcodeHeight},N,N,N^FD${barcodeValue}^FS\n`;

    if (isStandalone) zpl += `^XZ\n`;
    return zpl;
  }
  if (isVertical) {
    // VERTICAL ORIENTATION (Rotated 90 degrees)
    // We want to center the whole block of rows along the labelWidth (which is now the "height" of the stack)
    // And center each row along the labelHeight (which is now the "width" of the row)

    const totalStackWidth = rackCodeFontSize + 60 + detailsFontSize + 40 + (barcodeWidth * 11 * 4); // Estimated width with padding
    const startX = xOffset + Math.max(labelMargin, (labelWidth - totalStackWidth) / 2);
    const startY = yOffset + labelMargin;
    const rowLength = labelHeight - (labelMargin * 2);

    let currentX = startX;

    // 1. Large Rack Code
    zpl += `^FO${currentX},${startY}^A0R,${rackCodeFontSize},${rackCodeFontSize}^FB${rowLength},1,0,C^FD${rackCode}^FS\n`;
    currentX += rackCodeFontSize + 60;

    // 3. Details
    if (shelf !== undefined || floor !== undefined) {
      zpl += `^FO${currentX},${startY}^A0R,${detailsFontSize},${detailsFontSize}^FB${rowLength},1,0,C^FDShelf: ${shelf || '-'} | Floor: ${floor || '-'}^FS\n`;
      currentX += detailsFontSize + 40;
    }

    // 4. Barcode
    const barcodeFullWidth = (barcodeValue.length + 3) * 11 * barcodeWidth;
    const bcY = startY + Math.max(0, (rowLength - barcodeFullWidth) / 2);
    zpl += `^BY${barcodeWidth},2,${barcodeHeight}\n`;
    zpl += `^FO${currentX},${bcY}^BCR,${barcodeHeight},Y,N,N^FD${barcodeValue}^FS\n`;

  } else {
    // HORIZONTAL ORIENTATION (Normal)
    // We want to center the whole block of rows along the labelHeight (stack height)
    // And center each row along the labelWidth (row width)

    const totalStackHeight = rackCodeFontSize + 20 + detailsFontSize + 20 + barcodeHeight + 40;
    const startY = yOffset + Math.max(labelMargin, (labelHeight - totalStackHeight) / 2);
    const startX = xOffset + labelMargin;
    const rowLength = labelWidth - (labelMargin * 2);

    let currentY = startY;

    // 1. Large Rack Code
    zpl += `^FO${startX},${currentY}^A0N,${rackCodeFontSize},${rackCodeFontSize}^FB${rowLength},1,0,C^FD${rackCode}^FS\n`;
    currentY += rackCodeFontSize + 20;

    // 3. Details
    if (shelf !== undefined || floor !== undefined) {
      zpl += `^FO${startX},${currentY}^A0N,${detailsFontSize},${detailsFontSize}^FB${rowLength},1,0,C^FDShelf: ${shelf || '-'} | Floor: ${floor || '-'}^FS\n`;
      currentY += detailsFontSize + 20;
    }

    // 4. Barcode
    const barcodeFullWidth = (barcodeValue.length + 3) * 11 * barcodeWidth;
    const bcX = startX + Math.max(0, (rowLength - barcodeFullWidth) / 2);
    zpl += `^BY${barcodeWidth},2,${barcodeHeight}\n`;
    zpl += `^FO${bcX},${currentY}^BCN,${barcodeHeight},Y,N,N^FD${barcodeValue}^FS\n`;
  }

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
    boxId?: string;
    labelWidth?: number;
    labelHeight?: number;
    xOffset?: number;
    yOffset?: number;
    qrCodeSize?: number;
    titleFontSize?: number;
    detailsFontSize?: number;
    boxIdFontSize?: number;
    yarnFontSize?: number;
    supplierFontSize?: number;
    shadeLotFontSize?: number;
    orientation?: 'horizontal' | 'vertical';
  } = {}
): string => {
  const {
    yarnName,
    supplierName,
    poNumber,
    lotNumber,
    shadeCode,
    weight,
    boxId,
    labelWidth = 812,
    labelHeight = 400,
    xOffset = 0,
    yOffset = 0,
    qrCodeSize = 5,
    titleFontSize = 20,
    detailsFontSize = 20,
    boxIdFontSize = 20,
    yarnFontSize = 20,
    supplierFontSize = 20,
    shadeLotFontSize = 20,
  } = options;

  const labelMargin = 30; // Increased margin to prevent cutting at edges
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
      // Smarter wrap: try spaces first, then common delimiters like dash/slash
      const chunk = remaining.substring(0, maxCharsPerLine);
      let breakAt = chunk.lastIndexOf(' ');
      if (breakAt === -1) {
        const lastDash = chunk.lastIndexOf('-');
        const lastSlash = chunk.lastIndexOf('/');
        breakAt = Math.max(lastDash, lastSlash);
      }

      // If no delimiter found, force break at maxChars to prevent total overflow
      if (breakAt === -1) breakAt = maxCharsPerLine;

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

  // PORTRAIT NARROW LABEL (e.g. 50x70mm): QR on top, details below, all vertically centered
  if (labelWidth < 500 && labelHeight >= 500) {
    const qrW = qrCodeSize * 30;
    const gap = 20; // Increased gap

    // Total height of details block with more generous spacing to prevent overlap
    const boxIdH = boxId ? boxIdFontSize + 12 : 0;
    const supplierH = supplierFontSize + 12;
    const yarnH = (yarnFontSize + 8) * 2;
    const lotShadeH = shadeLotFontSize + 5;

    const detailsHeight = boxIdH + supplierH + yarnH + lotShadeH;
    const totalBlockHeight = qrW + gap + detailsHeight;

    // Moved up by 40 dots to align higher as requested, but ensure it doesn't go below margin
    const blockStartY = Math.max(labelMargin, (yOffset + Math.max(labelMargin, Math.floor((labelHeight - totalBlockHeight) / 2)) - 40));

    if (options.orientation === 'vertical') {
      const rowLen = labelHeight - (labelMargin * 2);
      const step = 48; // Wider lanes to prevent overlap
      let curX = 40;
      const xStart = yOffset + labelMargin;
      const maxCharsVert = Math.floor(rowLen / (boxIdFontSize * 0.5));

      if (boxId) {
        const boxIdLabel = `Box ID: ${boxId}`;
        const boxIdLines = wrapText(boxIdLabel, maxCharsVert);
        for (const line of boxIdLines) {
          zpl += `^FO${curX},${xStart}^A0R,${boxIdFontSize},${boxIdFontSize}^FB${rowLen},1,0,L^FD${line}^FS\n`;
          curX += step;
        }
      }

      const supplierLabel = `Supplier: ${supplierName || '-'}`;
      const supplierLines = wrapText(supplierLabel, maxCharsVert);
      for (const line of supplierLines) {
        zpl += `^FO${curX},${xStart}^A0R,${supplierFontSize},${supplierFontSize}^FB${rowLen},1,0,L^FD${line}^FS\n`;
        curX += step;
      }

      const fullName = (yarnName ? `Yarn: ${yarnName}` : '-');
      const nameLines = wrapText(fullName, maxCharsVert);
      for (const line of nameLines) {
        zpl += `^FO${curX},${xStart}^A0R,${yarnFontSize},${yarnFontSize}^FB${rowLen},1,0,L^FD${line}^FS\n`;
        curX += step;
      }

      zpl += `^FO${curX},${xStart}^A0R,${shadeLotFontSize},${shadeLotFontSize}^FB${rowLen},1,0,L^FDL: ${lotNumber || '-'}^FS\n`;
      curX += step;
      zpl += `^FO${curX},${xStart}^A0R,${shadeLotFontSize},${shadeLotFontSize}^FB${rowLen},1,0,L^FDS: ${shadeCode || '-'}^FS\n`;
      if (weight && weight > 0) {
        curX += step;
        zpl += `^FO${curX},${xStart}^A0R,${shadeLotFontSize},${shadeLotFontSize}^FB${rowLen},1,0,L^FDWT: ${weight} kg^FS\n`;
      }

      const qrYPos = yOffset + Math.max(0, Math.floor((labelHeight - qrW) / 2));
      zpl += `^FO${labelWidth - qrW - 30},${qrYPos}^BQN,2,${qrCodeSize}^FDQA,${barcodeValue}^FS\n`;

      if (isStandalone) zpl += `^XZ\n`;
      return zpl;
    }

    // HORIZONTAL: QR on top, details below, all vertically centered
    const contentWidth = labelWidth - (labelMargin * 2);
    // 0.5 ratio allows text to use more horizontal space before wrapping
    const maxChars = Math.floor(contentWidth / (boxIdFontSize * 0.5));
    let curY = blockStartY;

    // 0. QR Code at top (centered)
    zpl += `^FO${Math.max(0, Math.floor((labelWidth - qrW) / 2))},${curY}^BQN,2,${qrCodeSize}^FDQA,${barcodeValue}^FS\n`;
    curY += qrW + gap;

    // 1. Box ID - wrap if long
    if (boxId) {
      const boxIdLabel = `Box ID: ${boxId}`;
      const boxIdLines = wrapText(boxIdLabel, maxChars);
      for (const line of boxIdLines) {
        zpl += `^FO${labelMargin},${curY}^A0N,${boxIdFontSize},${boxIdFontSize}^FB${contentWidth},1,0,L^FD${line}^FS\n`;
        curY += boxIdFontSize + 12; // Increased gap to prevent overlap
      }
      curY += 4;
    }

    // 2. Supplier - wrap if long
    const supplierLabel = `Supplier: ${supplierName || '-'}`;
    const supplierLines = wrapText(supplierLabel, maxChars);
    for (const line of supplierLines) {
      zpl += `^FO${labelMargin},${curY}^A0N,${supplierFontSize},${supplierFontSize}^FB${contentWidth},1,0,L^FD${line}^FS\n`;
      curY += supplierFontSize + 12;
    }
    curY += 6;

    // 3. Yarn - Allow more lines
    if (yarnName) {
      const fullName = `Yarn: ${yarnName}`;
      const nameLines = wrapText(fullName, maxChars);
      for (const line of nameLines) {
        zpl += `^FO${labelMargin},${curY}^A0N,${yarnFontSize},${yarnFontSize}^FB${contentWidth},1,0,L^FD${line}^FS\n`;
        curY += yarnFontSize + 12;
      }
    }
    curY += 4;

    // 4. Lot and Shade on separate lines
    zpl += `^FO${labelMargin},${curY}^A0N,${shadeLotFontSize},${shadeLotFontSize}^FB${contentWidth},1,0,L^FDL: ${lotNumber || '-'}^FS\n`;
    curY += shadeLotFontSize + 12;
    zpl += `^FO${labelMargin},${curY}^A0N,${shadeLotFontSize},${shadeLotFontSize}^FB${contentWidth},1,0,L^FDS: ${shadeCode || '-'}^FS\n`;
    if (weight && weight > 0) {
      curY += shadeLotFontSize + 12;
      zpl += `^FO${labelMargin},${curY}^A0N,${shadeLotFontSize},${shadeLotFontSize}^FB${contentWidth},1,0,L^FDWT: ${weight} kg^FS\n`;
    }

    if (isStandalone) zpl += `^XZ\n`;
    return zpl;
  }
  if (isSmallSideBySide) {
    // SIDE-BY-SIDE LAYOUT (e.g. 50x25mm) - same field order as browser test print
    const labelMarginSmall = 30; // Increased from 20 to prevent left-side cutoff
    const dataWidth = Math.floor(labelWidth * 0.62) - labelMarginSmall;
    const qrSectionX = xOffset + dataWidth + labelMarginSmall;
    // QR code size estimation for Version 3-4 at mag 4/5
    const qrWidth = qrCodeSize * 34;
    let yPos = 10 + yOffset; // Reduced top gap
    const xPos = labelMarginSmall + xOffset;
    const detailsFont = 18; // Fixed font size to 18
    const lineHeight = detailsFont + 4;

    const charWidthFactor = 0.62;
    const maxYarnChars = Math.floor(dataWidth / (detailsFont * charWidthFactor));

    // Helper for Bold/Darker text (double printing)
    const printBold = (text: string, x: number, y: number, font: number, fieldData: string) => {
      zpl += `^FO${x},${y}^A0N,${font},${font}^FD${fieldData}^FS\n`;
    };

    // 1. Yarn Name (title) - Darkened (Bold)
    if (yarnName) {
      const nameLines = wrapText(yarnName, maxYarnChars);
      nameLines.slice(0, 2).forEach((line) => {
        printBold("Yarn", xPos, yPos, detailsFont, line);
        yPos += lineHeight + 1;
      });
    }

    // 2. Supplier (Allow wrapping) - Darkened (Bold)
    const supplierText = `Supplier: ${supplierName || '-'}`;
    const supplierLines = wrapText(supplierText, maxYarnChars);
    supplierLines.slice(0, 2).forEach((line) => {
      printBold("Supplier", xPos, yPos, detailsFont, line);
      yPos += lineHeight;
    });

    // 3. PO - Darkened (Bold)
    const poText = `PO: ${poNumber || '-'}`;
    printBold("PO", xPos, yPos, detailsFont, poText);
    yPos += lineHeight;

    // 4. Lot - Darkened (Bold)
    const lotText = `L: ${lotNumber || '-'}`;
    printBold("Lot", xPos, yPos, detailsFont, lotText);
    yPos += lineHeight;

    // 5. Shade (Allow wrapping) - Darkened (Bold)
    const shadeText = `S: ${shadeCode || '-'}`;
    const shadeLines = wrapText(shadeText, maxYarnChars);
    shadeLines.slice(0, 2).forEach((line) => {
      printBold("Shade", xPos, yPos, detailsFont, line);
      yPos += lineHeight;
    });
    if (weight && weight > 0) {
      printBold("Weight", xPos, yPos, detailsFont, `WT: ${weight} kg`);
      yPos += lineHeight;
    }

    // QR Code Alignment: Perfect centering in the right segment
    const rightAreaW = labelWidth - qrSectionX - 10;
    const qrXPos = qrSectionX + Math.max(0, Math.floor((rightAreaW - qrWidth) / 2));
    const qrYPos = yOffset + Math.max(10, Math.floor((labelHeight - qrWidth) / 2));
    zpl += `^FO${qrXPos},${qrYPos}^BQN,2,${qrCodeSize}^FDQA,${barcodeValue}^FS\n`;

  } else {
    // LAYOUT MATCHING BROWSER TEST PRINT: data left (~65%), QR right (~33%)
    const dataWidth = Math.floor(labelWidth * 0.65) - labelMargin;
    const qrSectionX = xOffset + dataWidth + labelMargin;
    const qrWidth = qrCodeSize * 30;
    const yarnNameFontH = titleFontSize;
    const lineHeight = yarnNameFontH + 3;
    const maxCharsPerLine = Math.floor(dataWidth / (detailsFontSize * 0.55));

    let yPos = 5 + yOffset;
    const xPos = labelMargin + xOffset;

    // 1. Yarn Name (title) - same as browser .title
    if (yarnName) {
      const nameLines = wrapText(yarnName, maxCharsPerLine);
      for (const line of nameLines.slice(0, 4)) {
        zpl += `^FO${xPos},${yPos}^A0N,${titleFontSize},${titleFontSize}^FB${dataWidth},1,0,L^FD${line}^FS\n`;
        yPos += lineHeight;
      }
    }

    // 2. Supplier - same order as browser
    const supplierLabel = `Supplier: ${supplierName || '-'}`;
    const supplierLines = wrapText(supplierLabel, maxCharsPerLine);
    for (const line of supplierLines.slice(0, 2)) {
      zpl += `^FO${xPos},${yPos}^A0N,${detailsFontSize},${detailsFontSize}^FB${dataWidth},1,0,L^FD${line}^FS\n`;
      yPos += lineHeight;
    }

    // 3. PO
    zpl += `^FO${xPos},${yPos}^A0N,${detailsFontSize},${detailsFontSize}^FB${dataWidth},1,0,L^FDPO: ${poNumber || '-'}^FS\n`;
    yPos += lineHeight;

    // 4. Lot
    zpl += `^FO${xPos},${yPos}^A0N,${detailsFontSize},${detailsFontSize}^FB${dataWidth},1,0,L^FDLot: ${lotNumber || '-'}^FS\n`;
    yPos += lineHeight;

    // 5. Shade
    zpl += `^FO${xPos},${yPos}^A0N,${detailsFontSize},${detailsFontSize}^FB${dataWidth},1,0,L^FDShade: ${shadeCode || '-'}^FS\n`;
    yPos += lineHeight;

    // 6. Weight
    if (weight && weight > 0) {
      zpl += `^FO${xPos},${yPos}^A0N,${detailsFontSize},${detailsFontSize}^FB${dataWidth},1,0,L^FDWT: ${weight} kg^FS\n`;
      yPos += lineHeight;
    }

    // 7. QR Code on the right (browser .qr width 33%)
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
      boxIdFontSize?: number;
      yarnFontSize?: number;
      shadeLotFontSize?: number;
      barcodeHeight?: number;
      barcodeWidth?: number;
      orientation?: 'horizontal' | 'vertical';
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
      orientation?: 'horizontal' | 'vertical';
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
      const rawW = options.customSettings.paperWidth || 812;
      const rawH = options.customSettings.paperHeight || 1218;
      const { width: paperWidth, height: paperHeight } = effectivePaperSize(rawW, rawH, options.customSettings.orientation);
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
            barcodeHeight,
            orientation: options.customSettings.orientation
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
    const msg = error?.message || '';
    if (msg.includes('blocked') || msg.includes('Request blocked')) {
      const currentUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
        : '';
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qz-tray-request-blocked', { detail: { url: currentUrl } }));
      }
      return {
        success: false,
        printed: 0,
        error: `Request blocked by QZ Tray. Add this site in QZ Tray → Site Manager → + → ${currentUrl}`,
      };
    }
    return { success: false, printed: 0, error: msg || 'Print failed' };
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
    boxId?: string;
  }>,
  options: {
    printerName?: string;
    customSettings?: {
      paperWidth?: number;
      paperHeight?: number;
      orientation?: 'horizontal' | 'vertical';
      labelsPerPage?: number;
      columnsPerRow?: number;
      firstLabelTopMargin?: number;
      showCutLines?: boolean;
      qrCodeSize?: number;
      titleFontSize?: number;
      detailsFontSize?: number;
      boxIdFontSize?: number;
      yarnFontSize?: number;
      supplierFontSize?: number;
      shadeLotFontSize?: number;
      barcodeHeight?: number;
      barcodeWidth?: number;
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
      const rawW = options.customSettings.paperWidth || 812;
      const rawH = options.customSettings.paperHeight || 1218;
      const { width: paperWidth, height: paperHeight } = effectivePaperSize(rawW, rawH, options.customSettings.orientation);
      const firstLabelTopMargin = options.customSettings.firstLabelTopMargin || 0;
      const labelsPerPage = options.customSettings.labelsPerPage || 1;
      const columnsPerRow = options.customSettings.columnsPerRow || 1;
      const showCutLines = options.customSettings.showCutLines !== false;

      const labelWidth = Math.floor(paperWidth / columnsPerRow);
      const rowsPerPage = Math.ceil(labelsPerPage / columnsPerRow);
      const labelHeight = Math.floor(paperHeight / rowsPerPage);

      const qrCodeSize = options.customSettings.qrCodeSize ?? 6;
      const titleFontSize = options.customSettings.titleFontSize ?? 25;
      const detailsFontSize = options.customSettings.detailsFontSize ?? 20;
      const boxIdFontSize = options.customSettings.boxIdFontSize ?? 20;
      const yarnFontSize = options.customSettings.yarnFontSize ?? 20;
      const supplierFontSize = options.customSettings.supplierFontSize ?? 20;
      const shadeLotFontSize = options.customSettings.shadeLotFontSize ?? 20;

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
            boxId: cone.boxId,
            labelWidth,
            labelHeight,
            xOffset,
            yOffset,
            qrCodeSize,
            titleFontSize,
            detailsFontSize,
            boxIdFontSize,
            yarnFontSize,
            supplierFontSize,
            shadeLotFontSize
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
    const msg = error?.message || '';
    if (msg.includes('blocked') || msg.includes('Request blocked')) {
      const currentUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
        : '';
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qz-tray-request-blocked', { detail: { url: currentUrl } }));
      }
      return {
        success: false,
        printed: 0,
        error: `Request blocked by QZ Tray. Add this site in QZ Tray → Site Manager → + → ${currentUrl}`,
      };
    }
    return { success: false, printed: 0, error: msg || 'Print failed' };
  }
};
