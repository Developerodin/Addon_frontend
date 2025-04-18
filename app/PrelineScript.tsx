"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PrelineScript() {
  const path = usePathname();

  useEffect(() => {
    const loadPreline = async () => {
      try {
        // Import the default export from preline
        const preline = await import('preline/dist/preline.js');
        
        // Initialize Preline
        if (typeof window !== 'undefined') {
          window.HSStaticMethods = preline.default.HSStaticMethods;
          window.HSOverlay = preline.default.HSOverlay;
          
          // Initialize all components
          preline.default.HSStaticMethods?.autoInit();
          preline.default.HSOverlay?.autoInit();
        }
      } catch (error) {
        console.error('Error initializing Preline:', error);
      }
    };

    loadPreline();
  }, [path]);

  return null;
}