"use client";

import { useState, useEffect } from 'react';

export const QZTrayRequestBlocked = () => {
  const [show, setShow] = useState(false);
  const [blockedUrl, setBlockedUrl] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRequestBlocked = (event: CustomEvent) => {
      setBlockedUrl(event.detail?.url || '');
      setShow(true);
    };

    window.addEventListener('qz-tray-request-blocked', handleRequestBlocked as EventListener);

    return () => {
      window.removeEventListener('qz-tray-request-blocked', handleRequestBlocked as EventListener);
    };
  }, []);

  const handleDismiss = () => {
    setShow(false);
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
                <i className="ri-error-warning-line text-2xl text-red-600"></i>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                QZ Tray Request Blocked
              </h3>
              <p className="text-sm text-gray-600">
                Your site needs to be added to QZ Tray's allowed list
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
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex items-start gap-3">
                <i className="ri-shield-cross-line text-red-600 text-xl mt-0.5"></i>
                <div>
                  <h4 className="font-semibold text-red-900 mb-2">
                    Request Blocked by QZ Tray
                  </h4>
                  <p className="text-sm text-red-800">
                    QZ Tray is blocking requests from <code className="bg-red-100 px-1 rounded">{blockedUrl}</code>
                  </p>
                  <p className="text-sm text-red-800 mt-2">
                    You need to manually add your site to QZ Tray's allowed list using the Site Manager.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <h4 className="font-semibold text-blue-900 mb-3">
                📋 How to Add Your Site to QZ Tray's Allowed List:
              </h4>
              
              <div className="bg-blue-100 p-3 rounded mb-3 border-2 border-blue-300">
                <p className="text-xs font-semibold text-blue-900 mb-1">Copy this URL to add:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-2 py-1.5 rounded text-sm font-mono text-blue-900 border border-blue-300">
                    {blockedUrl}
                  </code>
                  <button
                    onClick={(e) => {
                      navigator.clipboard.writeText(blockedUrl);
                      const btn = e.currentTarget;
                      const originalHTML = btn.innerHTML;
                      btn.innerHTML = '<i class="ri-check-line"></i> Copied!';
                      setTimeout(() => {
                        btn.innerHTML = originalHTML;
                      }, 2000);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <i className="ri-file-copy-line"></i> Copy
                  </button>
                </div>
              </div>

              <ol className="list-decimal list-inside space-y-3 text-sm text-blue-800">
                <li>
                  <strong>Open QZ Tray Site Manager:</strong>
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li>Look for QZ Tray icon in your menu bar (macOS) or system tray (Windows)</li>
                    <li><strong>Right-click</strong> the QZ Tray icon</li>
                    <li>Click <strong>"Site Manager"</strong> from the menu</li>
                  </ul>
                </li>
                <li>
                  <strong>Add Your Site:</strong>
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li>In the Site Manager window, make sure you're on the <strong>"Allowed"</strong> tab</li>
                    <li>Click the <strong>"+"</strong> (plus) button at the bottom</li>
                    <li>Paste or enter your site URL: <code className="bg-blue-100 px-1 rounded font-mono text-xs">{blockedUrl}</code></li>
                    <li>Click <strong>"OK"</strong> or <strong>"Add"</strong></li>
                    <li className="text-red-700 font-semibold">⚠️ Make sure to add the EXACT URL shown above (including http:// or https://)</li>
                  </ul>
                </li>
                <li>
                  <strong>Close and Retry:</strong>
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li>Click <strong>"Close"</strong> in the Site Manager</li>
                    <li>Go back to your app and try printing again</li>
                    <li>The "Request blocked" error should be gone</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <h4 className="font-semibold text-yellow-900 mb-2">
                ⚠️ Important Notes:
              </h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-yellow-800">
                <li><strong>Site Manager is the ONLY reliable way</strong> to permanently allow HTTP sites</li>
                <li>The security dialog's "Remember this decision" may not work for HTTP/Untrusted websites</li>
                <li>After adding to Site Manager, you may still see the security dialog once - click "Allow" and it should work</li>
                <li>If you're using HTTPS, the security dialog should work normally with "Remember this decision"</li>
              </ul>
            </div>

            <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
              <h4 className="font-semibold text-gray-900 mb-2">
                🔍 Can't Find QZ Tray Icon?
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-800">
                <li><strong>macOS:</strong> Look in the menu bar (top-right area, near clock)</li>
                <li><strong>Windows:</strong> Look in the system tray (bottom-right, near clock)</li>
                <li><strong>Linux:</strong> Look in the system tray or notification area</li>
                <li>If you can't see it, QZ Tray might not be running - start it from Applications/Programs</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded hover:bg-purple-700 transition-colors"
            >
              Got it, I'll add it to Site Manager
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
