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
import { VendorSecondaryCheckingScanAccept } from "./components/VendorSecondaryCheckingScanAccept";
import {
  VendorSecondaryCheckingM1StagingModal,
  type PendingSecondaryCheckingPatch,
} from "./components/VendorSecondaryCheckingM1StagingModal";
import { productionFlowListParams } from "../utils/vendorPoProductionFlowList";
import { m1RemainingForTransfer } from "./utils/m1Staging";
import { evaluateSecondaryCheckingSave } from "./utils/evaluateSecondaryCheckingSave";

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
    /** M1 staging modal sits above the process drawer — close it so Save isn’t blocked. */
    setM1StagingModalOpen(false);
    setM1StagingFlow(null);
    setM1StagingPatch(null);
    setM1StagingDisplayTotals(null);
    setM1StagingRequireContainer(false);
    setM1StagingPlannedQtyHint(0);
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
        setProcessingData({
          received: q.received || 0,
          repairStatus: q.repairStatus || "NOT_REQUIRED",
          repairRemarks: q.repairRemarks || "",
          /** M1/M2/M4 inputs stay empty until the user enters totals (see save validation). */
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

  const [m1StagingModalOpen, setM1StagingModalOpen] = useState(false);
  const [m1StagingFlow, setM1StagingFlow] = useState<VendorProductionFlow | null>(
    null,
  );
  const [m1StagingPatch, setM1StagingPatch] =
    useState<PendingSecondaryCheckingPatch | null>(null);
  const [m1StagingDisplayTotals, setM1StagingDisplayTotals] = useState<{
    m1: number;
    m2: number;
    m4: number;
  } | null>(null);
  const [m1StagingRequireContainer, setM1StagingRequireContainer] =
    useState(false);
  const [m1StagingPlannedQtyHint, setM1StagingPlannedQtyHint] = useState(0);

  const processDrawerSaveEval = useMemo(() => {
    if (!selectedFlow) return null;
    return evaluateSecondaryCheckingSave(
      selectedFlow.floorQuantities.secondaryChecking,
      processingData,
      selectedFlow.plannedQuantity,
    );
  }, [selectedFlow, processingData]);

  /**
   * Drawer Save: PATCH immediately when the body has no M1 field; otherwise open the M1 staging
   * modal (container scan when saving positive M1 — see requireContainer flags below).
   */
  const handleSaveProcessing = async () => {
    if (!selectedFlow) {
      toast.error("Batch not loaded — close the drawer and open Process again.");
      return;
    }

    const currentSc = selectedFlow.floorQuantities.secondaryChecking;
    const ev = evaluateSecondaryCheckingSave(
      currentSc,
      processingData,
      selectedFlow.plannedQuantity,
    );
    if (!ev.ok) {
      toast.error(ev.error);
      return;
    }

    setSaving(true);
    try {
      if (ev.route === "immediate") {
        const updated = await vendorProductionFlowService.updateFloor(
          selectedFlow.id,
          "secondaryChecking",
          ev.body,
        );
        setFlows((prev) =>
          prev.map((f) => (f.id === updated.id ? updated : f)),
        );
        toast.success("Secondary checking updated");
        closeProcessDrawer();
        return;
      }

      /** Staging modal applies PATCH; container + auto-transfer when user entered positive M1. */
      const { m1Remaining: _staleM1Rem, ...scRest } = currentSc;
      const mergedSc = {
        ...scRest,
        m1Quantity: ev.displayTotals.m1,
        m2Quantity: ev.displayTotals.m2,
        m4Quantity: ev.displayTotals.m4,
      };
      const plannedHint = m1RemainingForTransfer(
        mergedSc as VendorProductionFlow["floorQuantities"]["secondaryChecking"],
      );

      setM1StagingFlow(selectedFlow);
      setM1StagingPatch(ev.body);
      setM1StagingDisplayTotals(ev.displayTotals);
      const m1Positive =
        ev.body.m1Quantity !== undefined && ev.body.m1Quantity > 0;
      setM1StagingRequireContainer(m1Positive);
      setM1StagingPlannedQtyHint(plannedHint);
      closeProcessDrawer();
      queueMicrotask(() => setM1StagingModalOpen(true));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleBoxScanAccepted = useCallback(
    (result: { flow: Record<string, any> | null }) => {
      if (result.flow) {
        setFlows((prev) => {
          const fId = result.flow?.id;
          const exists = prev.some((f) => f.id === fId);
          if (exists) {
            return prev.map((f) =>
              f.id === fId ? (result.flow as unknown as VendorProductionFlow) : f,
            );
          }
          return [result.flow as unknown as VendorProductionFlow, ...prev];
        });
      }
      loadFlows();
    },
    [loadFlows],
  );

  return (
    <>
      <div className="main-content !p-[10px] !pb-0">
        <VendorSecondaryCheckingScanAccept onAccepted={handleBoxScanAccepted} />
      </div>
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
        saveDisabled={
          saving ||
          processDrawerFetching ||
          !(processDrawerSaveEval?.ok ?? false)
        }
      />
      <VendorSecondaryCheckingM1StagingModal
        open={m1StagingModalOpen}
        baselineFlow={m1StagingFlow}
        pendingPatch={m1StagingPatch}
        displayTotals={m1StagingDisplayTotals}
        requireContainerScan={m1StagingRequireContainer}
        plannedTransferQtyHint={m1StagingPlannedQtyHint}
        onClose={() => {
          setM1StagingModalOpen(false);
          setM1StagingFlow(null);
          setM1StagingPatch(null);
          setM1StagingDisplayTotals(null);
          setM1StagingRequireContainer(false);
          setM1StagingPlannedQtyHint(0);
        }}
        onFloorUpdated={(updated) => {
          setFlows((prev) =>
            prev.map((f) => (f.id === updated.id ? updated : f)),
          );
        }}
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
