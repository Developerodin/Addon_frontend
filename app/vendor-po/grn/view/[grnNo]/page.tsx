"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import vendorGrnService, { type VendorGrn } from "@/shared/services/vendorGrnService";

/** Vendor PO GRN detail + print view (API-backed snapshot). */
const GRNViewPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const grnNoRaw = (params?.grnNo as string) ?? "";
  const grnNo = decodeURIComponent(grnNoRaw);
  const isPrint = searchParams?.get("print") === "1";

  const [grn, setGrn] = useState<VendorGrn | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const doc = await vendorGrnService.getByNumber(grnNo);
        if (!cancelled) setGrn(doc);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load GRN");
          setGrn(null);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [grnNo]);

  useEffect(() => {
    if (isPrint && grn) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [isPrint, grn]);

  const handlePrint = () => window.print();

  if (!loaded) {
    return (
      <div className="main-content">
        <Seo title="GRN" />
        <div className="box">
          <div className="box-body text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-gray-600">Loading GRN…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="main-content">
        <Seo title="GRN Not Found" />
        <div className="box">
          <div className="box-body text-center py-12">
            <p className="text-gray-600 mb-4">
              {error || "GRN not found."}
            </p>
            <Link
              href="/vendor-po/grn"
              className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
            >
              <i className="ri-arrow-left-line me-2" />
              Back to GRN List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allItems = grn.lots.flatMap((lot) =>
    lot.items.map((item) => ({ lot, item })),
  );

  return (
    <div className="main-content print:text-black">
      <Seo title={`GRN ${grn.grnNumber}`} />
      <div className="box print:shadow-none print:border-0">
        <div className="box-header flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h1 className="box-title text-lg font-bold">{grn.grnNumber}</h1>
            <p className="text-sm text-gray-500">
              VPO {grn.vpoNumber} · {grn.vendor?.vendorName}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/vendor-po/grn" className="ti-btn ti-btn-light">
              Back
            </Link>
            <button type="button" className="ti-btn ti-btn-primary" onClick={handlePrint}>
              Print
            </button>
          </div>
        </div>

        <div className="box-body space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold">GRN Date</div>
              <div>{grn.grnDate ? new Date(grn.grnDate).toLocaleDateString() : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold">Vendor</div>
              <div>{grn.vendor?.vendorName ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold">Expected</div>
              <div className="font-bold">{(grn.totals?.expected ?? 0).toLocaleString()} pcs</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold">Verified</div>
              <div className="font-bold text-emerald-700">
                {(grn.totals?.verified ?? 0).toLocaleString()} pcs
              </div>
            </div>
          </div>

          {grn.discrepancyDetails && (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
              <strong>Discrepancy:</strong> {grn.discrepancyDetails}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-600">
                  <th className="border px-2 py-2 text-left">Lot / Invoice</th>
                  <th className="border px-2 py-2 text-left">Article</th>
                  <th className="border px-2 py-2 text-left">Vendor code</th>
                  <th className="border px-2 py-2 text-right">Expected</th>
                  <th className="border px-2 py-2 text-right">Scan accepted</th>
                  <th className="border px-2 py-2 text-right">Verified</th>
                  <th className="border px-2 py-2 text-right">M1</th>
                  <th className="border px-2 py-2 text-right">M2</th>
                  <th className="border px-2 py-2 text-right">M3</th>
                  <th className="border px-2 py-2 text-right">M4</th>
                  <th className="border px-2 py-2 text-right">Variance</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map(({ lot, item }, idx) => (
                  <tr key={`${lot.lotNumber}-${idx}`}>
                    <td className="border px-2 py-2 font-medium">{lot.lotNumber}</td>
                    <td className="border px-2 py-2">{item.productName}</td>
                    <td className="border px-2 py-2">{item.vendorCode || "—"}</td>
                    <td className="border px-2 py-2 text-right">{item.expectedQty}</td>
                    <td className="border px-2 py-2 text-right">{item.scanAcceptedQty}</td>
                    <td className="border px-2 py-2 text-right font-bold">{item.verifiedQty}</td>
                    <td className="border px-2 py-2 text-right">{item.m1}</td>
                    <td className="border px-2 py-2 text-right">{item.m2}</td>
                    <td className="border px-2 py-2 text-right">{item.m3}</td>
                    <td className="border px-2 py-2 text-right">{item.m4}</td>
                    <td
                      className={`border px-2 py-2 text-right font-semibold ${
                        item.varianceQty > 0
                          ? "text-emerald-700"
                          : item.varianceQty < 0
                            ? "text-red-700"
                            : ""
                      }`}
                    >
                      {item.varianceQty}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={3} className="border px-2 py-2 text-right">
                    Totals
                  </td>
                  <td className="border px-2 py-2 text-right">{grn.totals?.expected ?? 0}</td>
                  <td className="border px-2 py-2 text-right">—</td>
                  <td className="border px-2 py-2 text-right">{grn.totals?.verified ?? 0}</td>
                  <td className="border px-2 py-2 text-right">{grn.totals?.m1 ?? 0}</td>
                  <td className="border px-2 py-2 text-right">{grn.totals?.m2 ?? 0}</td>
                  <td className="border px-2 py-2 text-right">{grn.totals?.m3 ?? 0}</td>
                  <td className="border px-2 py-2 text-right">{grn.totals?.m4 ?? 0}</td>
                  <td className="border px-2 py-2 text-right">{grn.totals?.variance ?? 0}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {grn.notes && (
            <p className="text-sm text-gray-600">
              <strong>Notes:</strong> {grn.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GRNViewPage;
