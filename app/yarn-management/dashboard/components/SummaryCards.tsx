"use client";
import React from "react";
import { InventorySummary } from "../types";

interface SummaryCardsProps {
  summary: InventorySummary;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`box border-l-4 ${card.borderColor} ${card.bgColor} hover:shadow-md transition-shadow`}
        >
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <h3 className={`text-2xl font-bold ${card.color}`}>
                  {card.value}
                </h3>
              </div>
              <div className={`${card.color} text-3xl opacity-20`}>
                <i className={card.icon}></i>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;

