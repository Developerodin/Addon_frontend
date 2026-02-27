"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { CheckingQueueEntry, CheckingClassification } from "../../types";
import { getCheckingQueue, updateCheckingEntry, getNextGRN } from "../../data";
import { addToBrandingQueueFromGRN } from "@/app/vendor-po/branding/data";

const VendorPOCheckingProcessPage = () => {
  const params = useParams();
  const router = useRouter();
  const entryId = params?.entryId as string;

  const [entry, setEntry] = useState<CheckingQueueEntry | null>(null);
  const [showClassificationModal, setShowClassificationModal] = useState(false);
  const [classification, setClassification] = useState<Record<string, CheckingClassification>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const queue = getCheckingQueue();
    const found = queue.find((e) => e.id === entryId) ?? null;
    setEntry(found);
    if (found) {
      const initial: Record<string, CheckingClassification> = {};
      found.articles.forEach((a) => {
        initial[a.articleId] = {
          fresh: 0,
          m4Return: 0,
          m4Inhouse: 0,
          m2: 0,
          m3: 0,
          remark: "",
        };
      });
      setClassification(initial);
    }
  }, [entryId]);

  const setArticleClassification = (articleId: string, field: keyof CheckingClassification, value: number | string) => {
    setClassification((prev) => ({
      ...prev,
      [articleId]: { ...prev[articleId], [field]: value },
    }));
  };

  const validateClassification = (): boolean => {
    if (!entry) return false;
    for (const a of entry.articles) {
      const c = classification[a.articleId] || { fresh: 0, m4Return: 0, m4Inhouse: 0, m2: 0, m3: 0 };
      const sum = c.fresh + c.m4Return + c.m4Inhouse + c.m2 + c.m3;
      if (sum !== a.receivedQty) {
        toast.error(`${a.articleName}: Fresh + M4-Return + M4-Inhouse + M2 + M3 must equal ${a.receivedQty}`);
        return false;
      }
      if ([c.fresh, c.m4Return, c.m4Inhouse, c.m2, c.m3].some((n) => n < 0)) {
        toast.error("Quantities cannot be negative.");
        return false;
      }
    }
    return true;
  };

  const handleConfirmChecking = () => {
    if (!entry) return;
    if (!validateClassification()) return;
    setIsSubmitting(true);
    try {
      const grn = getNextGRN();
      const totals = entry.articles.reduce(
        (acc, a) => {
          const c = classification[a.articleId] || { fresh: 0, m4Return: 0, m4Inhouse: 0, m2: 0, m3: 0 };
          acc.totalM1 += c.fresh;
          acc.totalM2 += c.m2;
          acc.totalM3 += c.m3;
          acc.totalM4 += c.m4Return + c.m4Inhouse;
          return acc;
        },
        { totalM1: 0, totalM2: 0, totalM3: 0, totalM4: 0 }
      );
      const articleClassifications: Record<string, { fresh: number; m4Return: number; m4Inhouse: number; m2: number; m3: number }> = {};
      entry.articles.forEach((a) => {
        const c = classification[a.articleId] || { fresh: 0, m4Return: 0, m4Inhouse: 0, m2: 0, m3: 0 };
        articleClassifications[a.articleId] = { fresh: c.fresh, m4Return: c.m4Return, m4Inhouse: c.m4Inhouse, m2: c.m2, m3: c.m3 };
      });
      updateCheckingEntry(entry.id, {
        status: "Completed",
        grnNumber: grn,
        completedAt: new Date().toISOString(),
        totals,
        articleClassifications,
      });
      // Fresh qty per article → Branding Floor queue
      addToBrandingQueueFromGRN({
        grnNo: grn,
        poNo: entry.poNo,
        vendorName: entry.vendorName,
        priority: entry.priority,
        receivedDate: entry.receiveDate,
        articles: entry.articles.map((a) => {
          const c = articleClassifications[a.articleId] || { fresh: 0 };
          return { articleId: a.articleId, articleCode: a.articleCode, articleName: a.articleName, fresh: c.fresh };
        }),
      });
      setShowClassificationModal(false);
      toast.success(`Checking completed. GRN generated: ${grn}`);
      router.push("/vendor-po/checking");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to complete checking");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!entry) {
    return (
      <div className="main-content">
        <Seo title="Checking" />
        <div className="box">
          <div className="box-body text-center py-12">
            <p className="text-gray-600 mb-4">Checking entry not found.</p>
            <Link
              href="/vendor-po/checking"
              className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
            >
              <i className="ri-arrow-left-line me-2"></i>
              Back to Checking
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (entry.status === "Completed") {
    return (
      <div className="main-content">
        <Seo title={`Checking - ${entry.poNo}`} />
        <div className="box">
          <div className="box-body text-center py-12">
            <p className="text-gray-600 mb-2">This receipt has already been checked.</p>
            {entry.grnNumber && <p className="font-medium text-gray-900 mb-4">GRN: {entry.grnNumber}</p>}
            <Link
              href="/vendor-po/checking"
              className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
            >
              <i className="ri-arrow-left-line me-2"></i>
              Back to Checking
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title={`Checking - ${entry.poNo}`} />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Header - 4B */}
          <div className="box mb-6">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Link href="/vendor-po/checking" className="text-gray-500 hover:text-gray-700" title="Back">
                  <i className="ri-arrow-left-line text-lg"></i>
                </Link>
                <h3 className="box-title text-base">
                  <i className="ri-file-text-line me-2"></i>
                  PO Checking Detail
                </h3>
              </div>
            </div>
            <div className="box-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="form-label text-sm text-gray-600">PO No</label>
                  <div className="font-medium text-gray-900">{entry.poNo}</div>
                </div>
                <div>
                  <label className="form-label text-sm text-gray-600">Vendor</label>
                  <div className="text-gray-900">{entry.vendorName}</div>
                </div>
                <div>
                  <label className="form-label text-sm text-gray-600">Priority</label>
                  <div>
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {entry.priority}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Receive batch: {entry.receiveId} · {new Date(entry.receiveDate).toLocaleString()}
              </div>
              <div className="mt-2">
                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                  Status: Pending Checking
                </span>
              </div>
            </div>
          </div>

          {/* Article table - 4B */}
          <div className="box mb-6">
            <div className="box-header">
              <h3 className="box-title">Articles (pending checking)</h3>
            </div>
            <div className="box-body p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Article
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">
                        Received Qty
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {entry.articles.map((a) => (
                      <tr key={a.articleId} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                          {a.articleCode} – {a.articleName}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">
                          {a.receivedQty}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                          {a.notes || "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Button - vendor style */}
          <div className="box">
            <div className="box-body">
              <button
                type="button"
                onClick={() => setShowClassificationModal(true)}
                className="ti-btn ti-btn-success inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
              >
                <i className="ri-checkbox-circle-line me-1"></i>
                Checking Completed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4C Classification Modal */}
      {showClassificationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowClassificationModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b bg-primary text-white">
                <h3 className="text-lg font-semibold">Checking Summary — {entry.poNo}</h3>
                <p className="text-sm text-white/80 mt-1">Enter classification for each article. Fresh + M4-Return + M4-Inhouse + M2 + M3 must equal Received Qty.</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Received Qty</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Fresh *</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">M4-Return *</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">M4-Inhouse *</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">M2 *</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">M3 *</th>
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {entry.articles.map((a) => {
                        const c = classification[a.articleId] || { fresh: 0, m4Return: 0, m4Inhouse: 0, m2: 0, m3: 0, remark: "" };
                        const sum = c.fresh + c.m4Return + c.m4Inhouse + c.m2 + c.m3;
                        const valid = sum === a.receivedQty;
                        return (
                          <tr key={a.articleId} className={valid ? "" : "bg-red-50"}>
                            <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">{a.articleCode} – {a.articleName}</td>
                            <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-right">{a.receivedQty}</td>
                            <td className="border border-gray-300 px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                className="form-control form-control-sm text-right w-full"
                                value={c.fresh || ""}
                                onChange={(e) => setArticleClassification(a.articleId, "fresh", Number(e.target.value) || 0)}
                              />
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                className="form-control form-control-sm text-right w-full"
                                value={c.m4Return || ""}
                                onChange={(e) => setArticleClassification(a.articleId, "m4Return", Number(e.target.value) || 0)}
                              />
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                className="form-control form-control-sm text-right w-full"
                                value={c.m4Inhouse || ""}
                                onChange={(e) => setArticleClassification(a.articleId, "m4Inhouse", Number(e.target.value) || 0)}
                              />
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                className="form-control form-control-sm text-right w-full"
                                value={c.m2 || ""}
                                onChange={(e) => setArticleClassification(a.articleId, "m2", Number(e.target.value) || 0)}
                              />
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                className="form-control form-control-sm text-right w-full"
                                value={c.m3 || ""}
                                onChange={(e) => setArticleClassification(a.articleId, "m3", Number(e.target.value) || 0)}
                              />
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              <input
                                type="text"
                                className="form-control form-control-sm w-full"
                                placeholder="Optional"
                                value={c.remark || ""}
                                onChange={(e) => setArticleClassification(a.articleId, "remark", e.target.value)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClassificationModal(false)}
                  className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                >
                  Back / Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmChecking}
                  disabled={isSubmitting}
                  className="ti-btn ti-btn-success inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap disabled:opacity-50"
                >
                  {isSubmitting ? "Generating…" : "Confirm Checking & Generate GRN"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPOCheckingProcessPage;
