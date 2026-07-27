/**
 * Open the system print dialog without leaving a visible new browser tab.
 * @param html - Full HTML document to print
 * @param title - Accessible title for the hidden print frame
 * @returns Whether print was initiated
 */
export function printHtmlViaHiddenFrame(html: string, title = "Print document"): boolean {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = title;
  iframe.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!doc || !win) {
    iframe.remove();
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  const triggerPrint = () => {
    win.onafterprint = cleanup;
    win.focus();
    win.print();
    window.setTimeout(cleanup, 2000);
  };

  if (doc.readyState === "complete") {
    triggerPrint();
  } else {
    iframe.onload = triggerPrint;
  }

  return true;
}
