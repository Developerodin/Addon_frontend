"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import vendorProductionFlowService, {
  VendorProductionFlow,
  CreateProductionFlowPayload,
  mergeProductionFlowPreservePopulatedRefs,
} from "@/shared/services/vendorProductionFlowService";
import vendorManagementService, {
  VendorManagementDocument,
} from "@/shared/services/vendorManagementService";
import vendorPurchaseOrderService, {
  VendorPurchaseOrder,
} from "@/shared/services/vendorPurchaseOrderService";
import { VendorSecondaryCheckingCreateDrawer } from "./components/VendorSecondaryCheckingCreateDrawer";
import {
  VendorSecondaryCheckingProcessDrawer,
  type VendorSecondaryCheckingProcessData,
} from "./components/VendorSecondaryCheckingProcessDrawer";
import { VendorSecondaryCheckingListCard } from "./components/VendorSecondaryCheckingListCard";
import { VendorSecondaryCheckingPostSaveContainerDrawer } from "./components/VendorSecondaryCheckingPostSaveContainerDrawer";
import { productionFlowListParams } from "../utils/vendorPoProductionFlowList";

const SecondaryCheckingPage = () => {
  const [flows, setFlows] = useState<VendorProductionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Create Flow Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [vendors, setVendors] = useState<VendorManagementDocument[]>([]);
  const [vendorPos, setVendorPos] = useState<VendorPurchaseOrder[]>([]);
  const [createData, setCreateData] = useState<CreateProductionFlowPayload>({
    vendor: "",
    vendorPurchaseOrder: "",
    product: "",
    plannedQuantity: 0,
    referenceCode: "",
    remarks: "",
  });

  // Processing Modal State
  const [selectedFlow, setSelectedFlow] = useState<VendorProductionFlow | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingData, setProcessingData] =
    useState<VendorSecondaryCheckingProcessData>({});
  const [saving, setSaving] = useState(false);
  /** True while GET-by-id runs after clicking Process — avoids stale list data in the drawer. */
  const [processDrawerFetching, setProcessDrawerFetching] = useState(false);
  const processDrawerSessionRef = useRef(0);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vendorProductionFlowService.list(
        productionFlowListParams("secondaryChecking"),
      );
      setFlows(data.results || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load production flows");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const vData = await vendorManagementService.list({ limit: 1000 });
      setVendors(vData.results || []);
    } catch (err: any) {
      console.error("Failed to load vendors", err);
    }
  }, []);

  useEffect(() => {
    loadFlows();
    loadInitialData();
  }, [loadFlows, loadInitialData]);

  // Load POs when vendor changes in Create Modal
  useEffect(() => {
    if (createData.vendor) {
      void (async () => {
        try {
          const poData = await vendorPurchaseOrderService.list({
            vendor: createData.vendor,
            limit: 1000,
          });
          setVendorPos(poData.results || []);
        } catch (err) {
          console.error("Failed to load POs", err);
        }
      })();
    } else {
      setVendorPos([]);
    }
  }, [createData.vendor]);

  const filteredFlows = useMemo(() => {
    return flows.filter((f) => {
      const q = searchQuery.trim().toLowerCase();
      const refCode = f.referenceCode?.toLowerCase() || "";
      const vendorName =
        typeof f.vendor === "object"
          ? f.vendor?.header?.vendorName?.toLowerCase() || ""
          : "";
      const poNumber =
        typeof f.vendorPurchaseOrder === "object"
          ? f.vendorPurchaseOrder?.vpoNumber?.toLowerCase() || ""
          : "";

      return (
        !q ||
        refCode.includes(q) ||
        vendorName.includes(q) ||
        poNumber.includes(q)
      );
    });
  }, [flows, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFlows.length / itemsPerPage),
  );
  const paginatedFlows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFlows.slice(start, start + itemsPerPage);
  }, [filteredFlows, currentPage, itemsPerPage]);

  const handleCreateFlow = async () => {
    if (!createData.vendor) {
      toast.error("Vendor is required");
      return;
    }
    try {
      await vendorProductionFlowService.create(createData);
      toast.success("Production flow created");
      setIsCreateModalOpen(false);
      setCreateData({
        vendor: "",
        vendorPurchaseOrder: "",
        product: "",
        plannedQuantity: 0,
        referenceCode: "",
        remarks: "",
      });
      loadFlows();
    } catch (err: any) {
      toast.error(err.message || "Failed to create flow");
    }
  };

  const handleOpenProcess = (flow: VendorProductionFlow) => {
    /** Post-save container is z-[90+]; process drawer is z-50 — must close or Save clicks hit the invisible overlay. */
    setPostSaveContainerOpen(false);
    setPostSaveContainerFlow(null);
    const session = ++processDrawerSessionRef.current;
    setIsProcessing(true);
    setProcessDrawerFetching(true);
    setSelectedFlow(null);
    setProcessingData({});
    void (async () => {
      try {
        const fresh = await vendorProductionFlowService.getById(flow.id);
        if (session !== processDrawerSessionRef.current) return;
        setSelectedFlow(fresh);
        setFlows((prev) => prev.map((f) => (f.id === fresh.id ? fresh : f)));
        const q = fresh.floorQuantities.secondaryChecking;
        const qty = (v: unknown) => {
          const n = Number(v);
          if (!Number.isFinite(n)) return 0;
          return Math.max(0, Math.round(n));
        };
        setProcessingData({
          received: q.received || 0,
          repairStatus: q.repairStatus || "NOT_REQUIRED",
          repairRemarks: q.repairRemarks || "",
          stagingContainerBarcode: "",
          /** Prefill so ops edit the running total (e.g. 100 → 220), not a mistaken “+120 this visit” increment. */
          m1Quantity: qty(q.m1Quantity),
          m2Quantity: qty(q.m2Quantity),
          m4Quantity: qty(q.m4Quantity),
        });
      } catch (err: any) {
        if (session !== processDrawerSessionRef.current) return;
        toast.error(err.message || "Failed to load batch");
        setIsProcessing(false);
      } finally {
        if (session === processDrawerSessionRef.current) {
          setProcessDrawerFetching(false);
        }
      }
    })();
  };

  const closeProcessDrawer = useCallback(() => {
    processDrawerSessionRef.current += 1;
    setIsProcessing(false);
    setProcessDrawerFetching(false);
    setSelectedFlow(null);
  }, []);

  const [postSaveContainerOpen, setPostSaveContainerOpen] = useState(false);
  const [postSaveContainerFlow, setPostSaveContainerFlow] =
    useState<VendorProductionFlow | null>(null);

  /** After QC save: prompt to scan/confirm physical container only (no transfer drawer). */
  const openPostSaveContainer = useCallback((flow: VendorProductionFlow) => {
    setPostSaveContainerFlow(flow);
    setPostSaveContainerOpen(true);
  }, []);

  const handleSaveProcessing = async () => {
    if (!selectedFlow) {
      toast.error("Batch not loaded — close the drawer and open Process again.");
      return;
    }
    setSaving(true);
    try {
      const numOr0 = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      const received = numOr0(
        selectedFlow.floorQuantities.secondaryChecking.received,
      );
      const currentSc = selectedFlow.floorQuantities.secondaryChecking;
      const currentM1 = numOr0(currentSc.m1Quantity);
      const currentM2 = numOr0(currentSc.m2Quantity);
      const currentM4 = numOr0(currentSc.m4Quantity);
      const m1Quantity =
        processingData.m1Quantity !== undefined &&
        processingData.m1Quantity !== null
          ? Number(processingData.m1Quantity)
          : currentM1;
      const m2Quantity =
        processingData.m2Quantity !== undefined &&
        processingData.m2Quantity !== null
          ? Number(processingData.m2Quantity)
          : currentM2;
      const m4Quantity =
        processingData.m4Quantity !== undefined &&
        processingData.m4Quantity !== null
          ? Number(processingData.m4Quantity)
          : currentM4;

      if (
        [m1Quantity, m2Quantity, m4Quantity].some(
          (v) => !Number.isInteger(v) || v < 0,
        )
      ) {
        toast.error("M1, M2, and M4 must be whole numbers ≥ 0");
        return;
      }

      if (
        [received, m1Quantity, m2Quantity, m4Quantity].every(Number.isFinite) &&
        m1Quantity + m2Quantity + m4Quantity > received
      ) {
        toast.error("M1 + M2 + M4 cannot exceed batch received quantity");
        return;
      }

      const stagingBarcode = String(
        processingData.stagingContainerBarcode ?? "",
      ).trim();
      if (m1Quantity > 0 && !stagingBarcode) {
        toast.error(
          "Enter or scan the container barcode (required to stage M1 to Branding on save).",
        );
        return;
      }

      /** Replace with resolved M1/M2/M4; blank fields keep server values. */
      const payload: Record<string, unknown> = {
        mode: "replace",
        m1Quantity,
        m2Quantity,
        m4Quantity,
        repairStatus: processingData.repairStatus,
        repairRemarks: processingData.repairRemarks,
      };

      if (m1Quantity > 0 && stagingBarcode) {
        payload.existingContainerBarcode = stagingBarcode;
        payload.autoTransferToNextFloor = true;
      }

      const updated = await vendorProductionFlowService.updateFloor(
        selectedFlow.id,
        "secondaryChecking",
        payload,
      );
      toast.success("Secondary checking updated");
      setFlows((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      closeProcessDrawer();
      // Open after process drawer (z-70) unmounts so container step is never hidden underneath.
      queueMicrotask(() => openPostSaveContainer(updated));
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <VendorSecondaryCheckingListCard
        loading={loading}
        flows={flows}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onRefresh={loadFlows}
        onOpenCreate={() => setIsCreateModalOpen(true)}
        onOpenProcess={handleOpenProcess}
      />

      <VendorSecondaryCheckingCreateDrawer
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        createData={createData}
        setCreateData={setCreateData}
        vendors={vendors}
        vendorPos={vendorPos}
        onSubmit={handleCreateFlow}
      />

      <VendorSecondaryCheckingProcessDrawer
        open={isProcessing}
        flow={selectedFlow}
        onClose={closeProcessDrawer}
        loading={processDrawerFetching}
        processingData={processingData}
        setProcessingData={setProcessingData}
        onSave={handleSaveProcessing}
        saving={saving}
      />
      <VendorSecondaryCheckingPostSaveContainerDrawer
        open={postSaveContainerOpen}
        flow={postSaveContainerFlow}
        onClose={() => setPostSaveContainerOpen(false)}
        onTransferred={async (next) => {
          setFlows((prev) =>
            prev.map((f) =>
              f.id === next.id
                ? mergeProductionFlowPreservePopulatedRefs(f, next)
                : f,
            ),
          );
          await loadFlows();
        }}
      />
    </>
  );
};

export default SecondaryCheckingPage;
