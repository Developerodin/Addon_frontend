"use client";
import React from "react";
import {
  BoxTrackerResponse,
  ConeTrackerResponse,
} from "@/shared/services/yarnTrackerService";

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
  <div className="flex justify-between gap-2 py-1 border-b border-gray-50 last:border-0">
    <span className="text-xs text-gray-500 shrink-0">{label}</span>
    <span className="text-xs font-medium text-gray-900 text-right break-all">{value ?? "—"}</span>
  </div>
);

interface BoxTrackerDetailsProps {
  data: BoxTrackerResponse;
  /** Open relocate flow when box is already on a rack */
  onRelocate?: () => void;
}

/**
 * Summary card for scanned box.
 */
export const BoxTrackerDetails: React.FC<BoxTrackerDetailsProps> = ({ data, onRelocate }) => {
  const { box } = data;
  const qc = box.qcData;
  const canRelocate = Boolean(box.storedStatus && box.storageLocation);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 min-w-0">
          <i className="ri-box-3-line text-purple-600 shrink-0" aria-hidden />
          <span className="truncate" title={box.boxId}>Box {box.boxId}</span>
        </h3>
        {canRelocate && onRelocate ? (
          <button
            type="button"
            onClick={onRelocate}
            className="inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
            aria-label={`Relocate box ${box.boxId} to another rack`}
          >
            <i className="ri-arrow-left-right-line text-sm leading-none" aria-hidden />
            Relocate
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500 uppercase">Current (kg)</div>
          <div className="text-lg font-bold text-gray-900">{box.boxWeight ?? 0}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500 uppercase">Initial (kg)</div>
          <div className="text-lg font-bold text-gray-900">{box.initialWeight ?? "—"}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500 uppercase">Net (kg)</div>
          <div className="text-lg font-bold text-gray-900">{box.currentNetWeight?.toFixed(2) ?? "—"}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500 uppercase">Cones</div>
          <div className="text-lg font-bold text-gray-900">
            {data.cones.length}
            <span className="text-xs font-normal text-gray-500">
              {" "}
              / {box.numberOfCones ?? "?"}
            </span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        <DetailRow label="Barcode" value={box.barcode} />
        <DetailRow label="PO" value={box.poNumber} />
        <DetailRow label="Yarn" value={box.yarnName} />
        <DetailRow label="Lot" value={box.lotNumber} />
        <DetailRow label="Shade" value={box.shadeCode} />
        <DetailRow label="Location" value={box.storageLocation} />
        <DetailRow label="Stored" value={box.storedStatus ? "Yes" : "No"} />
        <DetailRow
          label="QC"
          value={
            qc?.status
              ? `${qc.status}${qc.username ? ` by ${qc.username}` : ""}`
              : "—"
          }
        />
        {qc?.remarks ? <DetailRow label="QC remarks" value={qc.remarks} /> : null}
        <DetailRow
          label="Cones issued"
          value={
            box.coneData?.conesIssued
              ? `Yes (${box.coneData.numberOfCones ?? 0})`
              : "No"
          }
        />
        <DetailRow label="Updated" value={box.updatedAt ? new Date(box.updatedAt).toLocaleString() : "—"} />
      </div>
      {data.cones.length > 0 ? (
        <div>
          <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Cones in this box</h4>
          <div className="max-h-40 overflow-y-auto border border-gray-100 rounded text-xs">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">Barcode</th>
                  <th className="px-2 py-1 text-right">Wt</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-left">Rack</th>
                </tr>
              </thead>
              <tbody>
                {data.cones.map((c) => (
                  <tr key={c._id} className="border-t border-gray-50">
                    <td className="px-2 py-1 font-mono">{c.barcode}</td>
                    <td className="px-2 py-1 text-right">{c.netWeight?.toFixed(2) ?? c.coneWeight}</td>
                    <td className="px-2 py-1">{c.issueStatus}</td>
                    <td className="px-2 py-1 font-mono truncate max-w-[80px]">{c.coneStorageId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface ConeTrackerDetailsProps {
  data: ConeTrackerResponse;
  /** Open relocate flow when cone is on a rack and not issued */
  onRelocate?: () => void;
}

/**
 * Summary card for scanned cone.
 */
export const ConeTrackerDetails: React.FC<ConeTrackerDetailsProps> = ({ data, onRelocate }) => {
  const cone = data.cone;
  const issueStatus = String(cone.issueStatus ?? "").toLowerCase();
  const isIssued = issueStatus === "issued";
  const machineLabel = String(cone.machineLabel ?? "").trim();
  const machineFloor = String(cone.machineFloor ?? "").trim();
  const canRelocate = Boolean(cone.coneStorageId) && !isIssued;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {isIssued ? (
        <div
          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2"
          role="status"
          aria-label="Cone issued to production"
        >
          <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
            Issued to production
          </p>
          {machineLabel ? (
            <p className="text-sm font-bold text-blue-950 mt-0.5">
              Machine: {machineLabel}
              {machineFloor ? (
                <span className="font-normal text-blue-800"> · {machineFloor} floor</span>
              ) : null}
            </p>
          ) : (
            <p className="text-xs text-blue-800 mt-0.5">Machine not recorded on issue transaction</p>
          )}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 min-w-0">
          <i className="ri-contrast-drop-line text-purple-600 shrink-0" aria-hidden />
          <span className="truncate" title={String(cone.barcode ?? "")}>
            Cone {String(cone.barcode ?? "")}
          </span>
        </h3>
        {canRelocate && onRelocate ? (
          <button
            type="button"
            onClick={onRelocate}
            className="inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
            aria-label={`Relocate cone ${String(cone.barcode ?? "")} to another rack`}
          >
            <i className="ri-arrow-left-right-line text-sm leading-none" aria-hidden />
            Relocate
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500 uppercase">Current (kg)</div>
          <div className="text-lg font-bold text-gray-900">{Number(cone.coneWeight ?? 0)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500 uppercase">Tear (kg)</div>
          <div className="text-lg font-bold text-gray-900">{Number(cone.tearWeight ?? 0)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500 uppercase">Net (kg)</div>
          <div className="text-lg font-bold text-gray-900">
            {typeof cone.netWeight === "number" ? cone.netWeight.toFixed(2) : "—"}
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        <DetailRow label="PO" value={String(cone.poNumber ?? data.parentBox?.poNumber ?? "")} />
        <DetailRow label="Parent box" value={String(cone.parentBoxId ?? "")} />
        <DetailRow label="Yarn" value={String(cone.yarnName ?? "")} />
        <DetailRow label="Shade" value={String(cone.shadeCode ?? "")} />
        <DetailRow label="Storage" value={String(cone.coneStorageId ?? "")} />
        <DetailRow label="Issue status" value={String(cone.issueStatus ?? "")} />
        {isIssued && machineLabel ? (
          <DetailRow label="Issued machine" value={machineLabel} />
        ) : null}
        {isIssued && machineFloor ? (
          <DetailRow label="Machine floor" value={machineFloor} />
        ) : null}
        <DetailRow
          label="Production order"
          value={String(cone.productionOrderLabel ?? "—")}
        />
        <DetailRow label="Article" value={String(cone.articleLabel ?? "—")} />
        <DetailRow
          label="Issued"
          value={
            cone.issueDate
              ? `${new Date(String(cone.issueDate)).toLocaleString()}${cone.issueWeight != null ? ` · ${cone.issueWeight} kg` : ""}`
              : "—"
          }
        />
        <DetailRow label="Return status" value={String(cone.returnStatus ?? "")} />
        <DetailRow
          label="Returned"
          value={
            cone.returnDate
              ? `${new Date(String(cone.returnDate)).toLocaleString()}${cone.returnWeight != null ? ` · ${cone.returnWeight} kg` : ""}`
              : "—"
          }
        />
        <DetailRow label="Updated" value={cone.updatedAt ? new Date(String(cone.updatedAt)).toLocaleString() : "—"} />
      </div>
    </div>
  );
};
