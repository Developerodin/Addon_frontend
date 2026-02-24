"use client";

import React from "react";
import type { RackLocation } from "../types";

function zoneTone(zone: string) {
  const z = (zone || "").toUpperCase();
  if (z === "A") return "bg-blue-50 text-blue-700 border-blue-100";
  if (z === "B") return "bg-green-50 text-green-700 border-green-100";
  if (z === "C") return "bg-yellow-50 text-yellow-800 border-yellow-100";
  if (z === "D") return "bg-purple-50 text-purple-700 border-purple-100";
  return "bg-gray-50 text-gray-700 border-gray-200";
}

export default function RackLocationChip({
  location,
  emphasize = false,
  className = "",
}: {
  location: RackLocation;
  emphasize?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 border rounded ${
        emphasize ? "px-3 py-2" : "px-2 py-1"
      } ${zoneTone(location.zone)} ${className}`}
    >
      <span className={`${emphasize ? "text-sm" : "text-[11px]"} font-bold`}>
        Z{location.zone}
      </span>
      <span className={`${emphasize ? "text-sm" : "text-[11px]"} font-semibold`}>
        R{location.row}
      </span>
      <span className={`${emphasize ? "text-sm" : "text-[11px]"} font-semibold`}>
        C{location.column}
      </span>
      <span className={`${emphasize ? "text-sm" : "text-[11px]"} font-semibold`}>
        B{location.bin}
      </span>
    </div>
  );
}

