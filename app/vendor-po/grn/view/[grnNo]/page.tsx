"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Seo from "@/shared/layout-components/seo/seo";
import vendorGrnService, { type VendorGrn } from "@/shared/services/vendorGrnService";
import { printVendorGrnDocument } from "@/shared/utils/vendorGrnPrint";
import { fmtGrnINR } from "@/shared/utils/grnTotals";
import { CRM } from "../../../vendor-list/crmUiClasses";
import VendorGrnValuesEditor from "../../VendorGrnValuesEditor";

/** Vendor PO GRN detail view (API-backed snapshot). Print opens a dedicated GRN form. */
const GRNViewPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const grnNoRaw = (params?.grnNo as string) ?? "";
  const grnNo = decodeURIComponent(grnNoRaw);
  const isPrint = searchParams?.get("print") === "1";

  const [grn, setGrn] = useState<VendorGrn | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

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

  /**
   * Opens the vendor GRN template in a popup and triggers the browser print dialog.
   * @param doc - loaded GRN snapshot
   */
  const handlePrint = useCallback(async (doc: VendorGrn) => {
    setPrinting(true);
    try {
      await printVendorGrnDocument(doc);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to print GRN");
    } finally {
      setPrinting(false);
    }
  }, []);

  useEffect(() => {
    if (isPrint && grn) {
      void handlePrint(grn);
    }
  }, [isPrint, grn, handlePrint]);

  if (!loaded) {
    return (
      <div className={CRM.mainContent}>
        <Seo title="GRN" />
        <div className={CRM.loadingWrap}>
          <div className={CRM.spinner} />
          <p className={CRM.loadingLabel}>Loading GRN…</p>
        </div>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className={CRM.mainContent}>
        <Seo title="GRN Not Found" />
        <div className={CRM.emptyWrap}>
          <p className="text-[11px] text-[#7987A1] mb-4">{error || "GRN not found."}</p>
          <Link href="/vendor-po/grn" className={CRM.btnPrimary}>
            <i className="ri-arrow-left-line" aria-hidden="true" />
            Back to GRN List
          </Link>
        </div>
      </div>
    );
  }

  const allItems = grn.lots.flatMap((lot) =>
    lot.items.map((item) => ({ lot, item })),
  );

  return (
    <div className={CRM.mainContent}>
      <Seo title={`GRN ${grn.grnNumber}`} />
      <div className={CRM.card}>
        <div className={`${CRM.cardBody} flex flex-wrap items-center justify-between gap-3 border-b border-gray-100`}>
          <div>
            <h1 className={CRM.pageTitle}>{grn.grnNumber}</h1>
            <p className="text-[11px] text-[#7987A1] mt-0.5">
              VPO {grn.vpoNumber} · {grn.vendor?.vendorName}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/vendor-po/grn" className={CRM.btnSecondary}>
              Back
            </Link>
            <button
              type="button"
              className={CRM.btnPrimary}
              onClick={() => void handlePrint(grn)}
              disabled={printing}
              aria-label={`Print ${grn.grnNumber}`}
            >
              <i className={`ri-printer-line text-xs ${printing ? "animate-pulse" : ""}`} aria-hidden="true" />
              {printing ? "Printing…" : "Print"}
            </button>
          </div>
        </div>

        <div className={`${CRM.cardBody} space-y-4`}>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-[11px]">
            <div>
              <div className={CRM.label}>GRN Date</div>
              <div className="font-semibold text-gray-900">
                {grn.grnDate ? new Date(grn.grnDate).toLocaleDateString() : "—"}
              </div>
            </div>
            <div>
              <div className={CRM.label}>Invoice Date</div>
              <div className="font-semibold text-gray-900">
                {grn.invoiceDate ? new Date(grn.invoiceDate).toLocaleDateString() : "—"}
              </div>
            </div>
            <div>
              <div className={CRM.label}>Received Date</div>
              <div className="font-semibold text-gray-900">
                {grn.receivedDate ? new Date(grn.receivedDate).toLocaleDateString() : "—"}
              </div>
            </div>
            <div>
              <div className={CRM.label}>Vendor</div>
              <div className="font-semibold text-gray-900">{grn.vendor?.vendorName ?? "—"}</div>
            </div>
            <div>
              <div className={CRM.label}>Expected</div>
              <div className="font-bold tabular-nums">{(grn.totals?.expected ?? 0).toLocaleString()} pcs</div>
            </div>
            <div>
              <div className={CRM.label}>Verified</div>
              <div className="font-bold tabular-nums text-emerald-700">
                {(grn.totals?.verified ?? 0).toLocaleString()} pcs
              </div>
            </div>
            <div>
              <div className={CRM.label}>Final Total</div>
              <div className="font-bold tabular-nums text-purple-700">
                {fmtGrnINR(grn.totals?.grandTotal ?? 0)}
              </div>
            </div>
          </div>

          {grn.discrepancyDetails && (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-[11px]">
              <strong>Discrepancy:</strong> {grn.discrepancyDetails}
            </div>
          )}

          <div className={CRM.tableWrap}>
            <table className={CRM.table}>
              <thead>
                <tr className={CRM.theadTr}>
                  <th scope="col" className={CRM.th}>Lot / Invoice</th>
                  <th scope="col" className={CRM.th}>Article</th>
                  <th scope="col" className={CRM.th}>Vendor code</th>
                  <th scope="col" className={CRM.th}>HSN</th>
                  <th scope="col" className={CRM.thRight}>Expected</th>
                  <th scope="col" className={CRM.thRight}>Scan accepted</th>
                  <th scope="col" className={CRM.thRight}>Verified</th>
                  <th scope="col" className={CRM.thRight}>Rate</th>
                  <th scope="col" className={CRM.th}>Per</th>
                  <th scope="col" className={CRM.thRight}>Amount</th>
                  <th scope="col" className={CRM.thRight}>M1</th>
                  <th scope="col" className={CRM.thRight}>M2</th>
                  <th scope="col" className={CRM.thRight}>M3</th>
                  <th scope="col" className={CRM.thRight}>M4</th>
                  <th scope="col" className={CRM.thRight}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map(({ lot, item }, idx) => (
                  <tr key={`${lot.lotNumber}-${idx}`} className={CRM.tbodyTr}>
                    <td className={`${CRM.td} font-medium`}>{lot.lotNumber}</td>
                    <td className={CRM.td}>{item.productName}</td>
                    <td className={CRM.td}>{item.vendorCode || "—"}</td>
                    <td className={CRM.td}>{item.hsnCode || "—"}</td>
                    <td className={`${CRM.td} text-right tabular-nums`}>{item.expectedQty}</td>
                    <td className={`${CRM.td} text-right tabular-nums`}>{item.scanAcceptedQty}</td>
                    <td className={`${CRM.td} text-right tabular-nums font-bold`}>{item.verifiedQty}</td>
                    <td className={`${CRM.td} text-right tabular-nums`}>{fmtGrnINR(item.rate ?? 0)}</td>
                    <td className={CRM.td}>{item.unit || "Pairs"}</td>
                    <td className={`${CRM.td} text-right tabular-nums font-semibold`}>
                      {fmtGrnINR(item.amount ?? (item.verifiedQty || 0) * (item.rate ?? 0))}
                    </td>
                    <td className={`${CRM.td} text-right tabular-nums`}>{item.m1}</td>
                    <td className={`${CRM.td} text-right tabular-nums`}>{item.m2}</td>
                    <td className={`${CRM.td} text-right tabular-nums`}>{item.m3}</td>
                    <td className={`${CRM.td} text-right tabular-nums`}>{item.m4}</td>
                    <td
                      className={`${CRM.td} text-right tabular-nums font-semibold ${
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
                  <td colSpan={4} className={`${CRM.td} text-right`}>
                    Totals
                  </td>
                  <td className={`${CRM.td} text-right tabular-nums`}>{grn.totals?.expected ?? 0}</td>
                  <td className={`${CRM.td} text-right`}>—</td>
                  <td className={`${CRM.td} text-right tabular-nums`}>{grn.totals?.verified ?? 0}</td>
                  <td className={`${CRM.td} text-right`}>—</td>
                  <td className={`${CRM.td} text-right`}>—</td>
                  <td className={`${CRM.td} text-right tabular-nums`}>
                    {fmtGrnINR(grn.totals?.subTotal ?? 0)}
                  </td>
                  <td className={`${CRM.td} text-right tabular-nums`}>{grn.totals?.m1 ?? 0}</td>
                  <td className={`${CRM.td} text-right tabular-nums`}>{grn.totals?.m2 ?? 0}</td>
                  <td className={`${CRM.td} text-right tabular-nums`}>{grn.totals?.m3 ?? 0}</td>
                  <td className={`${CRM.td} text-right tabular-nums`}>{grn.totals?.m4 ?? 0}</td>
                  <td className={`${CRM.td} text-right tabular-nums`}>{grn.totals?.variance ?? 0}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {grn.notes && (
            <p className="text-[11px] text-[#7987A1]">
              <strong>Notes:</strong> {grn.notes}
            </p>
          )}

          <VendorGrnValuesEditor grn={grn} onSaved={setGrn} />
        </div>
      </div>
    </div>
  );
};

export default GRNViewPage;
