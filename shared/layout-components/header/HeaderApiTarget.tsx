"use client";

import React, { useEffect, useState } from "react";
import {
  API_TARGET_STORAGE_KEY,
  type ApiTarget,
  isLoopbackHost,
  readApiTarget,
} from "@/shared/data/utilities/api";

const OPTIONS: { value: ApiTarget; label: string; title: string }[] = [
  { value: "ec2-copy", label: "EC2 copy", title: "Port 8000, database addon" },
  { value: "factory-docker", label: "Factory Docker", title: "Port 8001, database addon2" },
];

/**
 * Local sync-test switch. Renders only on localhost / 127.0.0.1.
 * API_BASE_URL is captured at import time across the app, so switching writes localStorage and reloads.
 */
export default function HeaderApiTarget() {
  const [active, setActive] = useState<ApiTarget | null>(null);

  useEffect(() => {
    if (isLoopbackHost(window.location.hostname)) setActive(readApiTarget());
  }, []);

  if (active === null) return null;

  const select = (value: ApiTarget) => {
    if (value === active) return;
    try {
      if (value === "factory-docker") {
        window.localStorage.setItem(API_TARGET_STORAGE_KEY, "factory-docker");
      } else {
        window.localStorage.removeItem(API_TARGET_STORAGE_KEY);
      }
    } catch {
      return;
    }
    window.location.reload();
  };

  return (
    <div className="header-element flex items-center py-[1rem] md:px-[0.65rem] px-2">
      <div
        role="group"
        aria-label="API target"
        className="inline-flex rounded-md border border-defaultborder dark:border-white/10 overflow-hidden text-[0.75rem]"
      >
        {OPTIONS.map((opt) => {
          const pressed = active === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={pressed}
              title={opt.title}
              onClick={() => select(opt.value)}
              className={`px-2 py-1 font-medium whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                pressed
                  ? "bg-primary text-white"
                  : "bg-transparent text-defaulttextcolor dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
