"use client"
import "./globals.scss";
import { Provider } from "react-redux";
import store from "@/shared/redux/store";
import PrelineScript from "./PrelineScript";
import { useState } from "react";
import { Initialload } from "@/shared/contextapi";
import { NavigationProvider } from "@/shared/contextapi/navigationContext";
import { AuthProvider } from "@/shared/providers/AuthProvider";
import '../public/assets/css/dashboard-styles.css';

const RootLayout = ({children}:any) => {
  const [pageloading, setpageloading] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>Addons</title>
        <meta name="description" content="Addons - Your AI Assistant" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#845adf" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Addons" />
        <link rel="apple-touch-icon" href="/pwa/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){window.__addonsPWA=window.__addonsPWA||{deferredPrompt:null};window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__addonsPWA.deferredPrompt=e;window.dispatchEvent(new Event('addons-pwa-installable'));});window.addEventListener('appinstalled',function(){window.__addonsPWA.deferredPrompt=null;window.dispatchEvent(new Event('addons-pwa-installed'));});})();`,
          }}
        />
      </head>
      <body>
        <Provider store={store}>
          <AuthProvider>
            <NavigationProvider>
            <Initialload.Provider value={{ pageloading, setpageloading }}>
              {children}
            </Initialload.Provider>
            </NavigationProvider>
          </AuthProvider>
        </Provider>
        <PrelineScript />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </body>
    </html>
  );
};

export default RootLayout;
