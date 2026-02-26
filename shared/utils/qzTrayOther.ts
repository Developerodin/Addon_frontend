/**
 * QZ Tray - Other sections (e.g. Containers Master)
 * Container label printing and related helpers. Uses shared connect/load from qzTray.ts.
 * Keep qzTray.ts unchanged for yarn/rack/cone printing; extend this file for other sections.
 */

import { connectQZ, getDefaultPrinter, isQZLoaded } from "@/shared/utils/qzTray";

declare global {
  interface Window {
    qz?: any;
  }
}

/**
 * Resolve effective paper dimensions for ZPL/config from orientation.
 */
const effectivePaperSize = (
  paperWidth: number,
  paperHeight: number,
  orientation?: "horizontal" | "vertical"
): { width: number; height: number } => {
  return { width: paperWidth, height: paperHeight };
};

/**
 * Helper to create QZ Tray configuration for thermal labels (used by container labels).
 */
const getQZConfig = async (
  customSettings?: {
    paperWidth?: number;
    paperHeight?: number;
    orientation?: "horizontal" | "vertical";
  },
  printerName?: string
) => {
  if (typeof window === "undefined" || typeof window.qz === "undefined")
    return null;

  try {
    let targetPrinter = printerName;
    if (!targetPrinter) {
      targetPrinter = await window.qz.printers.getDefault();
    }

    if (!targetPrinter) {
      console.warn("[QZ Tray Other] No printer found");
      return null;
    }

    const printer = await window.qz.printers.find(targetPrinter);
    if (!printer) {
      console.warn(`[QZ Tray Other] Printer "${targetPrinter}" not found`);
      return null;
    }

    let width = 101.6;
    let height = 152.4;

    if (
      customSettings?.paperWidth != null &&
      customSettings?.paperHeight != null
    ) {
      const pw = customSettings.paperWidth;
      const ph = customSettings.paperHeight;
      const effective = effectivePaperSize(
        pw,
        ph,
        customSettings.orientation
      );
      width = effective.width * 0.125;
      height = effective.height * 0.125;
    }

    return window.qz.configs.create(printer, {
      size: { width, height },
      units: "mm",
      density: 203,
      reconnection: true,
      colorType: "black-white",
      interpolation: "nearest-neighbor",
      forceRaw: true,
    });
  } catch (err) {
    console.error("[QZ Tray Other] Config error:", err);
    return null;
  }
};

const wrapText = (text: string, maxCharsPerLine: number): string[] => {
  if (!text) return [];
  if (text.length <= maxCharsPerLine) return [text];

  const lines: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= maxCharsPerLine) {
      lines.push(remaining);
      break;
    }
    const chunk = remaining.substring(0, maxCharsPerLine);
    const breakAt =
      chunk.lastIndexOf(" ") !== -1 ? chunk.lastIndexOf(" ") : maxCharsPerLine;
    lines.push(remaining.substring(0, breakAt).trim());
    remaining = remaining.substring(breakAt).trim();
  }

  return lines;
};

/**
 * Generate ZPL for a single container label:
 * - Default: big QR on top, container name below (centered).
 * - Small 50×25 style: details left, QR on right (side-by-side), with name wrapping to 2 lines.
 */
export const generateZPLContainerLabel = (
  barcode: string,
  containerName: string,
  options: {
    labelWidth?: number;
    labelHeight?: number;
    xOffset?: number;
    yOffset?: number;
    qrCodeSize?: number;
    nameFontSize?: number;
  } = {}
): string => {
  const {
    labelWidth = 400,
    labelHeight = 560,
    xOffset = 0,
    yOffset = 0,
    qrCodeSize = 6,
    nameFontSize = 24,
  } = options;

  const labelMargin = 30;
  const qrW = qrCodeSize * 30;
  const gap = 20;
  const displayName = (containerName || barcode || "").trim() || barcode;

  // Detect small side‑by‑side layout (e.g. ~50×25mm labels)
  const isSmallSideBySide = labelHeight < 300 && labelWidth > 350;

  if (isSmallSideBySide) {
    // Left column: name (can wrap to 2 lines), vertically centered
    const labelMarginSmall = 30;
    const dataWidth =
      Math.floor(labelWidth * 0.62) - labelMarginSmall; // ~62% for text
    const xPos = xOffset + labelMarginSmall;

    const charWidthFactor = 0.55;
    const maxNameChars = Math.max(
      8,
      Math.floor(dataWidth / (nameFontSize * charWidthFactor))
    );
    const nameLines = wrapText(displayName, maxNameChars).slice(0, 2);
    const lineHeight = nameFontSize + 4;
    const totalTextHeight = nameLines.length * lineHeight;
    const startY = yOffset + Math.max(0, Math.floor((labelHeight - totalTextHeight) / 2));

    let zpl = "";
    nameLines.forEach((line, i) => {
      const lineY = startY + i * lineHeight;
      zpl += `^FO${xPos},${lineY}^A0N,${nameFontSize},${nameFontSize}^FB${dataWidth},1,0,L^FD${line}^FS\n`;
    });

    // Right column: QR code, vertically centered
    const qrSectionX = xOffset + dataWidth + labelMarginSmall;
    const rightAreaW = labelWidth - qrSectionX - 10;
    const qrApproxW = qrCodeSize * 30;
    const qrX =
      qrSectionX + Math.max(0, Math.floor((rightAreaW - qrApproxW) / 2));
    const qrY =
      yOffset + Math.max(10, Math.floor((labelHeight - qrApproxW) / 2));

    zpl += `^FO${qrX},${qrY}^BQN,2,${qrCodeSize}^FDQA,${barcode}^FS\n`;
    return zpl;
  }

  // Default layout: QR on top, name centered below
  const contentWidth = labelWidth - labelMargin * 2;
  const maxChars = Math.max(
    12,
    Math.floor(contentWidth / (nameFontSize * 0.55))
  );

  let zpl = "";
  const curY = yOffset + labelMargin;
  zpl += `^FO${xOffset + Math.max(0, Math.floor((labelWidth - qrW) / 2))},${curY}^BQN,2,${qrCodeSize}^FDQA,${barcode}^FS\n`;
  let textY = curY + qrW + gap;
  const lines = wrapText(displayName, maxChars);

  for (const line of lines) {
    zpl += `^FO${xOffset + labelMargin},${textY}^A0N,${nameFontSize},${nameFontSize}^FB${contentWidth},1,0,C^FD${line}^FS\n`;
    textY += nameFontSize + 8;
  }
  return zpl;
};

/**
 * Print container labels via QZ Tray: one label per container = big QR (barcode) + container name only.
 */
export const printContainerLabels = async (
  containers: Array<{ barcode: string; containerName?: string }>,
  options: {
    printerName?: string;
    customSettings?: {
      paperWidth?: number;
      paperHeight?: number;
      orientation?: "horizontal" | "vertical";
      labelsPerPage?: number;
      columnsPerRow?: number;
      firstLabelTopMargin?: number;
      showCutLines?: boolean;
      qrCodeSize?: number;
      detailsFontSize?: number;
    };
  } = {}
): Promise<{ success: boolean; printed: number; error?: string }> => {
  try {
    const connection = await connectQZ();
    if (!connection.isConnected) throw new Error(connection.error);

    const config = await getQZConfig(
      options.customSettings,
      options.printerName
    );
    if (!config)
      throw new Error(
        "Could not create QZ configuration. Please check your printer connection."
      );

    const custom = options.customSettings;
    const rawW = custom?.paperWidth ?? 398;
    const rawH = custom?.paperHeight ?? 558;
    const { width: paperWidth, height: paperHeight } = effectivePaperSize(
      rawW,
      rawH,
      custom?.orientation
    );
    const firstLabelTopMargin = custom?.firstLabelTopMargin ?? 0;
    const labelsPerPage = custom?.labelsPerPage ?? 1;
    const columnsPerRow = custom?.columnsPerRow ?? 1;
    const showCutLines = custom?.showCutLines !== false;
    const labelWidth = Math.floor(paperWidth / columnsPerRow);
    const rowsPerPage = Math.ceil(labelsPerPage / columnsPerRow);
    const labelHeight = Math.floor(paperHeight / rowsPerPage);
    const qrCodeSize = custom?.qrCodeSize ?? 6;
    const nameFontSize = custom?.detailsFontSize ?? 24;
    const labelsPerSheet = rowsPerPage * columnsPerRow;

    const labels: string[] = [];
    for (let i = 0; i < containers.length; i += labelsPerSheet) {
      let zpl = `^XA\n^PW${paperWidth}\n^LL${paperHeight}\n^CI28\n`;
      for (let j = 0; j < labelsPerSheet && i + j < containers.length; j++) {
        const c = containers[i + j];
        const row = Math.floor(j / columnsPerRow);
        const col = j % columnsPerRow;
        const xOffset = col * labelWidth;
        const yOffset =
          row === 0 ? firstLabelTopMargin : row * labelHeight;
        zpl += generateZPLContainerLabel(c.barcode, c.containerName ?? c.barcode, {
          labelWidth,
          labelHeight,
          xOffset,
          yOffset,
          qrCodeSize,
          nameFontSize,
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
    return { success: true, printed: containers.length };
  } catch (error: any) {
    console.error("[QZ Tray Other] Container print error:", error);
    const msg = error?.message || "";
    if (msg.includes("blocked") || msg.includes("Request blocked")) {
      const currentUrl =
        typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ":" + window.location.port : ""}`
          : "";
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("qz-tray-request-blocked", { detail: { url: currentUrl } })
        );
      }
      return {
        success: false,
        printed: 0,
        error: `Request blocked by QZ Tray. Add this site in QZ Tray → Site Manager → + → ${currentUrl}`,
      };
    }
    return { success: false, printed: 0, error: msg || "Print failed" };
  }
};

// Re-export shared QZ utilities so other sections can import from this file only
export { connectQZ, getDefaultPrinter, isQZLoaded } from "@/shared/utils/qzTray";
