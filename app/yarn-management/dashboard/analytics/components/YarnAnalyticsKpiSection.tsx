"use client";

import React from "react";
import type { PoAnalyticsResponse } from "../../services/yarnInventoryService";

export interface YarnAnalyticsKpiSectionProps {
  data: PoAnalyticsResponse | null;
}

const safeNum = (v: unknown): number => {
  if (v === null || v === undefined || typeof v !== "number" || isNaN(v)) return 0;
  return v;
};

export function YarnAnalyticsKpiSection({ data }: YarnAnalyticsKpiSectionProps) {
  if (!data) return null;

  const { cards, lotsSummary } = data;

  const orderedKg = safeNum(cards.orderedKg);
  const receivedKg = safeNum(cards.receivedAcceptedKg);
  const fulfilmentPct = orderedKg > 0 ? Math.round((receivedKg / orderedKg) * 100) : 0;

  const kpis = [
    {
      title: "Purchase Orders",
      value: safeNum(cards.poCount).toLocaleString(),
      icon: "ri-file-list-3-line",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      borderLeft: "border-blue-400",
      subtitle: `${safeNum(cards.draftCount)} drafts`,
    },
    {
      title: "Ordered Qty",
      value: `${orderedKg.toLocaleString()} kg`,
      icon: "ri-shopping-cart-2-line",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      borderLeft: "border-purple-400",
      subtitle: `across ${safeNum(cards.poCount)} POs`,
    },
    {
      title: "Received (Accepted)",
      value: `${receivedKg.toLocaleString()} kg`,
      icon: "ri-checkbox-circle-line",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      borderLeft: "border-green-400",
      subtitle: `${fulfilmentPct}% fulfilled`,
    },
    {
      title: "Outstanding",
      value: `${safeNum(cards.outstandingKg).toLocaleString()} kg`,
      icon: "ri-time-line",
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      borderLeft: "border-amber-400",
      subtitle: "pending delivery",
    },
    {
      title: "Rejected",
      value: `${safeNum(cards.rejectedKg).toLocaleString()} kg`,
      icon: "ri-close-circle-line",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
      borderLeft: "border-red-400",
      subtitle: "QC failures",
    },
    {
      title: "QC Pending",
      value: safeNum(cards.qcPendingPoCount).toLocaleString(),
      icon: "ri-flask-line",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      borderLeft: "border-orange-400",
      subtitle: "POs awaiting QC",
    },
    {
      title: "Total Lots",
      value: safeNum(lotsSummary.totalLots).toLocaleString(),
      icon: "ri-stack-line",
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
      borderLeft: "border-indigo-400",
      subtitle: `${safeNum(lotsSummary.lot_accepted)} accepted`,
    },
    {
      title: "Lot Breakdown",
      value: `${safeNum(lotsSummary.lot_pending)}P / ${safeNum(lotsSummary.lot_qc_pending)}Q / ${safeNum(lotsSummary.lot_rejected)}R / ${safeNum(lotsSummary.lot_accepted)}A`,
      icon: "ri-pie-chart-line",
      bgColor: "bg-cyan-50",
      iconColor: "text-cyan-600",
      borderLeft: "border-cyan-400",
      subtitle: "pending / QC / rejected / accepted",
    },
  ];

  return (
    <section role="region" aria-label="Purchase order summary metrics" className="mb-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {kpis.map((kpi) => (
          <div
            key={kpi.title}
            className={`flex items-center justify-between p-3 rounded-lg border-l-4 border border-gray-100 ${kpi.borderLeft} ${kpi.bgColor} transition-shadow hover:shadow-md`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                {kpi.title}
              </p>
              <p className={`text-sm font-extrabold truncate ${kpi.iconColor}`}>
                {kpi.value}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">{kpi.subtitle}</p>
            </div>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${kpi.bgColor} ${kpi.iconColor}`}
            >
              <i className={`${kpi.icon} text-lg`} aria-hidden />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
