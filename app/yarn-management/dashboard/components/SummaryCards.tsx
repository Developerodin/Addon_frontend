"use client";
import React from "react";
import { InventorySummary } from "../types";

interface SummaryCardsProps {
  summary: InventorySummary;
  loading?: boolean;
}

/**
 * Formats a weight in kilograms for summary cards (locale digits, up to 3 decimal places).
 */
function formatKg(kg: number): string {
  return `${Number(kg).toLocaleString(undefined, {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  })} kg`;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, loading = false }) => {
  const cards = [
    {
      title: "Total Stock",
      value: formatKg(summary.totalStock),
      icon: "ri-stack-line",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      title: "LTS",
      value: formatKg(summary.longTermKg),
      icon: "ri-building-2-line",
      color: "text-sky-600",
      bgColor: "bg-sky-50",
      borderColor: "border-sky-200",
    },
    {
      title: "STS",
      value: formatKg(summary.shortTermKg),
      icon: "ri-time-line",
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-200",
    },
    {
      title: "Unallocated",
      value: formatKg(summary.unallocatedKg),
      icon: "ri-inbox-unarchive-line",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      title: "Blocked",
      value: formatKg(summary.blockedKg),
      icon: "ri-lock-line",
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
    },
    {
      title: "Purchase Yarn",
      value: formatKg(summary.purchaseYarn),
      icon: "ri-shopping-cart-line",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      title: "Pending Deliveries",
      value: summary.pendingDeliveries.toString(),
      icon: "ri-truck-line",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      title: "Inventory Alerts",
      value: summary.inventoryAlerts.toString(),
      icon: "ri-alarm-warning-line",
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
  ];

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-4"
      aria-busy={loading}
    >
      {cards.map((card, index) => (
        <div
          key={index}
          className={`flex items-center justify-between p-3 rounded border-l-4 ${card.borderColor} ${card.bgColor} border border-gray-100 hover:shadow-sm transition-shadow`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
              {card.title}
            </p>
            {loading ? (
              <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" aria-hidden />
            ) : (
              <p className={`text-sm font-bold truncate ${card.color}`}>{card.value}</p>
            )}
          </div>
          <div className={`${card.color} text-xl opacity-30 flex-shrink-0 ml-2`} aria-hidden>
            <i className={card.icon}></i>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
