"use client";
import React from "react";
import { InventorySummary } from "../types";

interface SummaryCardsProps {
  summary: InventorySummary;
  loading?: boolean;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, loading = false }) => {
  const cards = [
    {
      title: "Total Stock",
      value: `${summary.totalStock.toLocaleString()} kg`,
      icon: "ri-stack-line",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      title: "Purchase Yarn",
      value: `${summary.purchaseYarn.toLocaleString()} kg`,
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
    {
      title: "Inventory Value",
      value: `₹${summary.inventoryValue.toLocaleString()}`,
      icon: "ri-money-rupee-circle-line",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`flex items-center justify-between p-3 rounded border-l-4 ${card.borderColor} ${card.bgColor} border border-gray-100 hover:shadow-sm transition-shadow`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">{card.title}</p>
            {loading ? (
              <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <p className={`text-sm font-bold truncate ${card.color}`}>{card.value}</p>
            )}
          </div>
          <div className={`${card.color} text-xl opacity-30 flex-shrink-0 ml-2`}>
            <i className={card.icon}></i>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;

