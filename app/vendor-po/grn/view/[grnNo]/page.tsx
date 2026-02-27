"use client";
import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { getCheckingQueue } from "../../../checking/data";
import type { CheckingQueueEntry } from "../../../checking/types";

/** 5B) GRN Detail Screen */
const GRNViewPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const grnNoRaw = (params?.grnNo as string) ?? "";
  const grnNo = decodeURIComponent(grnNoRaw);
  const isPrint = searchParams?.get("print") === "1";

  const [entry, setEntry] = useState<CheckingQueueEntry | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const queue = getCheckingQueue();
    const found = queue.find((e) => e.grnNumber === grnNo && e.status === "Completed") ?? null;
    setEntry(found);
    setLoaded(true);
  }, [grnNo]);

  useEffect(() => {
    if (isPrint && entry) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [isPrint, entry]);

  const handlePrint = () => window.print();

  if (!loaded) {
    return (
      <div className="main-content">
        <Seo title="GRN" />
        <div className="box">
          <div className="box-body text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading GRN…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="main-content">
        <Seo title="GRN Not Found" />
        <div className="box">
          <div className="box-body text-center py-12">
            <p className="text-gray-600 mb-4">GRN not found. It may have been cleared or this link was opened in a new tab.</p>
            <Link
              href="/vendor-po/grn"
              className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
            >
              <i className="ri-arrow-left-line me-2"></i>
              Back to GRN List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getArticleRow = (articleId: string) =>
    entry.articleClassifications?.[articleId] ?? {
      fresh: 0,
      m4Return: 0,
      m4Inhouse: 0,
      m2: 0,
      m3: 0,
    };

  /** When we have totals but no per-article data, prorate totals by received qty so individual rows are filled and sum to Total */
  const hasStoredPerArticle =
    entry.articleClassifications &&
    entry.articles.some((a) => {
      const r = entry.articleClassifications?.[a.articleId];
      return r && (r.fresh + r.m4Return + r.m4Inhouse + r.m2 + r.m3 > 0);
    });
  /** When we only have combined totalM4, split 50/50 between M4-Return and M4-Inhouse for display */
  const m4ReturnTotal = entry.totals ? Math.floor(entry.totals.totalM4 / 2) : 0;
  const m4InhouseTotal = entry.totals ? entry.totals.totalM4 - m4ReturnTotal : 0;

  const proratedRows: { fresh: number; m4Return: number; m4Inhouse: number; m2: number; m3: number }[] = (() => {
    if (hasStoredPerArticle || !entry.totals || entry.totalReceivedQty <= 0) return [];
    const total = entry.totalReceivedQty;
    const t = entry.totals;
    const rows = entry.articles.map((a, idx) => {
      const ratio = a.receivedQty / total;
      const isLast = idx === entry.articles.length - 1;
      return {
        fresh: isLast ? t.totalM1 - entry.articles.slice(0, -1).reduce((s, aa) => s + Math.round(t.totalM1 * (aa.receivedQty / total)), 0) : Math.round(t.totalM1 * ratio),
        m4Return: isLast ? m4ReturnTotal - entry.articles.slice(0, -1).reduce((s, aa) => s + Math.round(m4ReturnTotal * (aa.receivedQty / total)), 0) : Math.round(m4ReturnTotal * ratio),
        m4Inhouse: isLast ? m4InhouseTotal - entry.articles.slice(0, -1).reduce((s, aa) => s + Math.round(m4InhouseTotal * (aa.receivedQty / total)), 0) : Math.round(m4InhouseTotal * ratio),
        m2: isLast ? t.totalM2 - entry.articles.slice(0, -1).reduce((s, aa) => s + Math.round(t.totalM2 * (aa.receivedQty / total)), 0) : Math.round(t.totalM2 * ratio),
        m3: isLast ? t.totalM3 - entry.articles.slice(0, -1).reduce((s, aa) => s + Math.round(t.totalM3 * (aa.receivedQty / total)), 0) : Math.round(t.totalM3 * ratio),
      };
    });
    return rows;
  })();

  const getDisplayRow = (articleId: string, articleIndex: number) => {
    const stored = getArticleRow(articleId);
    const hasStored = (stored.fresh + stored.m4Return + stored.m4Inhouse + stored.m2 + stored.m3) > 0;
    if (hasStored) return stored;
    if (proratedRows[articleIndex]) return proratedRows[articleIndex];
    return stored;
  };

  const hasPerArticleData =
    entry.articleClassifications &&
    Object.keys(entry.articleClassifications).length > 0 &&
    entry.articles.some((a) => {
      const row = entry.articleClassifications?.[a.articleId];
      return row && (row.fresh + row.m4Return + row.m4Inhouse + row.m2 + row.m3 > 0);
    });
  const hasTotals = entry.totals && (entry.totals.totalM1 + entry.totals.totalM2 + entry.totals.totalM3 + entry.totals.totalM4 > 0);

  const tableBody = (
    <>
      {entry.articles.map((a, idx) => {
        const row = getDisplayRow(a.articleId, idx);
        return (
          <tr key={a.articleId}>
            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
              {a.articleCode} – {a.articleName}
            </td>
            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{a.receivedQty}</td>
            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{row.fresh}</td>
            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{row.m4Return}</td>
            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{row.m4Inhouse}</td>
            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{row.m2}</td>
            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{row.m3}</td>
          </tr>
        );
      })}
      {hasPerArticleData && (
        <tr className="bg-gray-100 font-medium">
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">Total</td>
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{entry.totalReceivedQty}</td>
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{entry.articles.reduce((s, a) => s + getArticleRow(a.articleId).fresh, 0)}</td>
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{entry.articles.reduce((s, a) => s + getArticleRow(a.articleId).m4Return, 0)}</td>
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{entry.articles.reduce((s, a) => s + getArticleRow(a.articleId).m4Inhouse, 0)}</td>
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{entry.articles.reduce((s, a) => s + getArticleRow(a.articleId).m2, 0)}</td>
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{entry.articles.reduce((s, a) => s + getArticleRow(a.articleId).m3, 0)}</td>
        </tr>
      )}
      {!hasPerArticleData && hasTotals && entry.totals && (
        <tr className="bg-gray-100 font-medium">
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">Total</td>
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{entry.totalReceivedQty}</td>
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{entry.totals.totalM1}</td>
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{m4ReturnTotal}</td>
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{m4InhouseTotal}</td>
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{entry.totals.totalM2}</td>
          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">{entry.totals.totalM3}</td>
        </tr>
      )}
    </>
  );

  return (
    <div className="main-content">
      <Seo title={`GRN - ${entry.grnNumber}`} />

      {/* Screen view: normal GRN Detail with back, Print/Download buttons */}
      <div className="grid grid-cols-12 gap-6 print:hidden">
        <div className="col-span-12">
          <div className="box mb-6">
            <div className="box-body">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Link href="/vendor-po/grn" className="text-gray-500 hover:text-gray-700" title="Back to GRN">
                    <i className="ri-arrow-left-line text-lg"></i>
                  </Link>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">GRN Detail</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{entry.grnNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handlePrint} className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap">
                    <i className="ri-printer-line me-2"></i> Print
                  </button>
                  <button type="button" onClick={() => window.print()} className="ti-btn ti-btn-secondary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap">
                    <i className="ri-file-download-line me-2"></i> Download PDF
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
                <div><label className="text-sm font-medium text-gray-600">GRN No</label><div className="font-medium text-gray-900 mt-1">{entry.grnNumber}</div></div>
                <div><label className="text-sm font-medium text-gray-600">Date</label><div className="text-gray-900 mt-1">{entry.completedAt ? new Date(entry.completedAt).toLocaleString() : "–"}</div></div>
                <div><label className="text-sm font-medium text-gray-600">Vendor</label><div className="text-gray-900 mt-1">{entry.vendorName}</div></div>
                <div><label className="text-sm font-medium text-gray-600">PO No</label><div className="text-gray-900 mt-1">{entry.poNo}</div></div>
              </div>
            </div>
          </div>
          <div className="box">
            <div className="box-body p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                      <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Received Qty</th>
                      <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Fresh</th>
                      <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">M4-Return</th>
                      <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">M4-Inhouse</th>
                      <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">M2</th>
                      <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">M3</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">{tableBody}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print / PDF only: proper GRN document */}
      <div className="hidden print:block p-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">GOODS RECEIVED NOTE</h1>
        <p className="text-center text-gray-600 font-medium mb-6">{entry.grnNumber}</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
          <div className="flex"><span className="font-medium text-gray-600 w-24">GRN No:</span><span>{entry.grnNumber}</span></div>
          <div className="flex"><span className="font-medium text-gray-600 w-24">Date:</span><span>{entry.completedAt ? new Date(entry.completedAt).toLocaleString() : "–"}</span></div>
          <div className="flex"><span className="font-medium text-gray-600 w-24">Vendor:</span><span>{entry.vendorName}</span></div>
          <div className="flex"><span className="font-medium text-gray-600 w-24">PO No:</span><span>{entry.poNo}</span></div>
        </div>
        <p className="text-sm font-medium text-gray-700 mb-2">Item-wise classification</p>
        <table className="min-w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Article</th>
              <th className="border border-gray-400 px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Received Qty</th>
              <th className="border border-gray-400 px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Fresh</th>
              <th className="border border-gray-400 px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase">M4-Return</th>
              <th className="border border-gray-400 px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase">M4-Inhouse</th>
              <th className="border border-gray-400 px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase">M2</th>
              <th className="border border-gray-400 px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase">M3</th>
            </tr>
          </thead>
          <tbody className="bg-white">{tableBody}</tbody>
        </table>
      </div>
    </div>
  );
};

export default GRNViewPage;
