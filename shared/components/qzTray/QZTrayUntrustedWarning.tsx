"use client";

import { useState, useEffect } from 'react';
import { isQZLoaded } from '@/shared/utils/qzTray';

interface QZTrayUntrustedWarningProps {
  onDismiss?: () => void;
}

export const QZTrayUntrustedWarning = ({ onDismiss }: QZTrayUntrustedWarningProps) => {
  const [show, setShow] = useState(false);
  const [isHTTP, setIsHTTP] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [httpsUrl, setHttpsUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;

    const isHTTPConnection = protocol === 'http:';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isUntrusted = isHTTPConnection && !isLocalhost;

    setIsHTTP(isHTTPConnection);
    setCurrentUrl(`${protocol}//${hostname}${port ? ':' + port : ''}`);
    setHttpsUrl(`https://${hostname}${port ? ':' + port : ''}`);

    // Check if dismissed permanently
    const dismissed = localStorage.getItem('qz-untrusted-warning-dismissed');
    if (dismissed === 'true') return;

    // Show warning if HTTP and not localhost
    if (isUntrusted) {
      // Check if we've already shown this warning today
      const lastShown = localStorage.getItem('qz-untrusted-warning-shown');
      const today = new Date().toDateString();

      if (lastShown !== today) {
        setShow(true);
        localStorage.setItem('qz-untrusted-warning-shown', today);
      }
    }

    // Listen for connection attempts to show warning
    const handleConnectionAttempt = (event: any) => {
      const dismissed = localStorage.getItem('qz-untrusted-warning-dismissed');
      if (dismissed !== 'true') {
        setShow(true);
        if (event.detail?.currentUrl) setCurrentUrl(event.detail.currentUrl);
        if (event.detail?.httpsUrl) setHttpsUrl(event.detail.httpsUrl);
      }
    };

    window.addEventListener('qz-tray-untrusted-warning', handleConnectionAttempt as EventListener);

    return () => {
      window.removeEventListener('qz-tray-untrusted-warning', handleConnectionAttempt as EventListener);
    };
  }, []);

  const handleDismiss = () => {
    setShow(false);
    onDismiss?.();
  };

  const handleDontShowAgain = () => {
    localStorage.setItem('qz-untrusted-warning-dismissed', 'true');
    setShow(false);
    onDismiss?.();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <i className="ri-shield-cross-line text-2xl text-red-600"></i>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                QZ Tray Security Prompt - Action Required
              </h3>
              <p className="text-sm text-gray-600">
                You're accessing this site via HTTP, which QZ Tray treats as "Untrusted website"
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          {/* Main Content */}
          <div className="space-y-4 mb-6">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex items-start gap-3">
                <i className="ri-alert-line text-yellow-600 text-xl mt-0.5"></i>
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-2">
                    When the security dialog appears:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
                    <li>
                      <strong>1. FIRST, CHECK the "Remember this decision" box</strong> ✅
                    </li>
                    <li>
                      <strong>2. WAIT for the "Allow" button to become enabled.</strong>
                      <p className="mt-1 text-xs opacity-90">
                        If you check the box and the button turns gray (disabled), just <strong>wait 5-10 seconds</strong>.
                        QZ Tray is processing the security certificate and it will re-enable automatically.
                      </p>
                    </li>
                    <li>
                      <strong>3. Click "Allow"</strong> once it turns blue again.
                    </li>
                    <li className="text-blue-700 font-medium">
                      If it stays gray for more than 15 seconds, uncheck and re-check the box, then wait again.
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">
                Why this appears:
              </h4>
              <p className="text-sm text-blue-800 mb-2">
                Your Next.js app is running on <code className="bg-blue-100 px-1 rounded">{currentUrl}</code> (HTTP).
                QZ Tray treats HTTP connections as "Untrusted website" for security.
              </p>
              {isHTTP && (
                <p className="text-sm text-blue-800">
                  <strong>Solution:</strong> Use HTTPS instead: <code className="bg-blue-100 px-1 rounded">{httpsUrl}</code>
                </p>
              )}
            </div>

            {isHTTP && (
              <>
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                  <h4 className="font-semibold text-green-900 mb-2">
                    💡 Best Solution: Use HTTPS
                  </h4>
                  <p className="text-sm text-green-800 mb-3">
                    HTTPS allows QZ Tray to automatically save certificate approvals. No repeated prompts!
                  </p>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-green-900">For Next.js development:</p>
                    <ol className="list-decimal list-inside space-y-1 text-green-800 ml-2">
                      <li>Install <code className="bg-green-100 px-1 rounded">mkcert</code> for local SSL certificates</li>
                      <li>Configure Next.js to use HTTPS in development</li>
                      <li>Access your app via <code className="bg-green-100 px-1 rounded">{httpsUrl}</code></li>
                    </ol>
                  </div>
                </div>

                <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded">
                  <h4 className="font-semibold text-purple-900 mb-2">
                    🔧 RECOMMENDED: Add to QZ Tray's "Site Manager"
                  </h4>
                  <p className="text-sm text-purple-800 mb-3">
                    This is the most reliable way to fix "Untrusted website" errors forever.
                  </p>

                  <div className="flex items-center gap-2 mb-4">
                    <code className="flex-1 bg-white border border-purple-200 p-2 rounded text-sm text-purple-900 truncate">
                      {currentUrl}
                    </code>
                    <button
                      onClick={copyToClipboard}
                      className="flex-shrink-0 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-1 text-sm font-medium"
                    >
                      {copied ? <i className="ri-check-line"></i> : <i className="ri-file-copy-line"></i>}
                      {copied ? 'Copied!' : 'Copy URL'}
                    </button>
                  </div>

                  <div className="space-y-2 text-sm text-purple-900">
                    <p>1. Right-click the <strong>QZ Tray icon</strong> in your system tray/menu bar.</p>
                    <p>2. Select <strong>"Site Manager"</strong>.</p>
                    <p>3. Click the <strong>"+" (Plus)</strong> button.</p>
                    <p>4. <strong>Paste</strong> the URL you just copied.</p>
                    <p>5. Click <strong>"Close"</strong> and refresh this page.</p>
                  </div>
                </div>
              </>
            )}

            <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
              <h4 className="font-semibold text-gray-900 mb-2">
                If "Remember this decision" checkbox is disabled/grayed out:
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-800">
                <li>Quit QZ Tray completely (right-click icon → Quit)</li>
                <li>Clear certificate cache:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li><strong>macOS:</strong> <code className="bg-gray-100 px-1 rounded">rm -rf ~/Library/Application\ Support/qz/auth/*</code></li>
                    <li><strong>Windows:</strong> Delete <code className="bg-gray-100 px-1 rounded">%APPDATA%\qz\auth\</code></li>
                    <li><strong>Linux:</strong> <code className="bg-gray-100 px-1 rounded">rm -rf ~/.qz/auth/*</code></li>
                  </ul>
                </li>
                <li>Restart QZ Tray</li>
                <li>Try connecting again - the checkbox should now be enabled</li>
                <li><strong>Check "Remember this decision" BEFORE clicking Allow</strong></li>
              </ol>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">
                ⚠️ Important: Order Matters!
              </h4>
              <p className="text-sm text-blue-800 mb-2">
                <strong>Check "Remember this decision" FIRST, then click Allow.</strong>
              </p>
              <p className="text-sm text-blue-800">
                If you click Allow first, the checkbox might get disabled. Always check the checkbox before clicking Allow.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={handleDontShowAgain}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Don't show again
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded hover:bg-purple-700 transition-colors"
            >
              Got it, I'll check "Remember this decision"
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
