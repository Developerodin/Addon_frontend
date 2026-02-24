"use client";

import React from "react";

type BadgeTone = "gray" | "yellow" | "blue" | "purple" | "green" | "red" | "orange";
type BadgeSize = "sm" | "md";

function toneClasses(tone: BadgeTone) {
  switch (tone) {
    case "yellow":
      return "bg-yellow-100 text-yellow-800";
    case "blue":
      return "bg-blue-100 text-blue-800";
    case "purple":
      return "bg-purple-100 text-purple-800";
    case "green":
      return "bg-green-100 text-green-800";
    case "red":
      return "bg-red-100 text-red-800";
    case "orange":
      return "bg-orange-100 text-orange-800";
    case "gray":
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function sizeClasses(size: BadgeSize) {
  return size === "sm"
    ? "px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight"
    : "px-2 py-1 text-[11px] font-bold rounded uppercase tracking-tight";
}

export default function StatusBadge({
  label,
  tone = "gray",
  size = "sm",
  className = "",
  title,
  icon,
}: {
  label: string;
  tone?: BadgeTone;
  size?: BadgeSize;
  className?: string;
  title?: string;
  icon?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 ${sizeClasses(size)} ${toneClasses(tone)} ${className}`}
    >
      {icon ? <i className={`${icon} text-[11px]`}></i> : null}
      <span>{label}</span>
    </span>
  );
}

