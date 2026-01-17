/**
 * QZ Tray Trust Management
 * Handles adding sites to QZ Tray's trusted list for HTTP connections
 */

/**
 * Get QZ Tray allowed sites file path based on OS
 */
export const getAllowedSitesPath = (): string | null => {
  if (typeof window === 'undefined') return null;

  const platform = navigator.platform.toLowerCase();
  const isMac = platform.includes('mac');
  const isWindows = platform.includes('win');
  const isLinux = platform.includes('linux');

  if (isMac) {
    return '~/Library/Application Support/qz/allowed.dat';
  } else if (isWindows) {
    return '%APPDATA%\\qz\\allowed.dat';
  } else if (isLinux) {
    return '~/.qz/allowed.dat';
  }

  return null;
};

/**
 * Get instructions to manually add site to QZ Tray's allowed list
 */
export const getAddToAllowedSitesInstructions = (url?: string): string => {
  const currentUrl = url || (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
    : '');

  const path = getAllowedSitesPath();
  const platform = typeof navigator !== 'undefined' ? navigator.platform.toLowerCase() : '';
  const isMac = platform.includes('mac');
  const isWindows = platform.includes('win');

  let instructions = `To permanently trust ${currentUrl} in QZ Tray:\n\n`;

  instructions += `1. Look for the QZ Tray icon (menu bar on Mac, system tray on Windows)\n`;
  instructions += `2. Right-click the icon and select "Site Manager"\n`;
  instructions += `3. Click the "+" (Plus) button\n`;
  instructions += `4. Type or paste the URL: ${currentUrl}\n`;
  instructions += `5. Click "Close" and refresh this page\n\n`;
  instructions += `Alternative for power users (Manual edit):\n`;

  if (isMac) {
    instructions += `1. Quit QZ Tray completely\n`;
    instructions += `2. Open Terminal and run:\n`;
    instructions += `   echo "${currentUrl}" >> ~/Library/Application\\ Support/qz/allowed.dat\n`;
    instructions += `3. Restart QZ Tray\n`;
  } else if (isWindows) {
    instructions += `1. Close QZ Tray completely\n`;
    instructions += `2. Open %APPDATA%\\qz\\allowed.dat in Notepad\n`;
    instructions += `3. Add "${currentUrl}" on a new line\n`;
    instructions += `4. Save and restart QZ Tray\n`;
  } else {
    instructions += `1. Close QZ Tray completely\n`;
    instructions += `2. echo "${currentUrl}" >> ~/.qz/allowed.dat\n`;
    instructions += `3. Restart QZ Tray\n`;
  }

  return instructions;
};
