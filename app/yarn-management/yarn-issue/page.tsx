"use client";
import React, { useMemo, useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

type RequirementStatus = "Not Issued" | "Partially Issued" | "Issued";

interface IssueLog {
  id: string;
  issueDate: string;
  coneBarcode: string;
  weightIssued: number;
  issuedBy: string;
}

interface YarnRequirement {
  id: string;
  yarnCode: string;
  yarnName: string;
  yarnType: string;
  requiredQty: number;
  tolerancePercent: number;
  shortTermAvailable: number;
  longTermAvailable: number;
  logs: IssueLog[];
}

interface ProductionOrder {
  id: string;
  orderNumber: string;
  buyer: string;
  floor: string;
  styleCode: string;
  scheduledDate: string;
  notes?: string;
  bom: YarnRequirement[];
}

type YarnSortField =
  | "yarnName"
  | "yarnCode"
  | "requiredQty"
  | "issuedQty"
  | "shortTermAvailable"
  | "longTermAvailable"
  | "status";

const ISSUE_TOLERANCE_DEFAULT = 0.2;

const getIssuedQty = (requirement: YarnRequirement) =>
  requirement.logs.reduce((sum, log) => sum + log.weightIssued, 0);

const getRequirementStatus = (requirement: YarnRequirement): RequirementStatus => {
  const issued = getIssuedQty(requirement);
  if (issued === 0) {
    return "Not Issued";
  }

  if (issued + 0.0001 < requirement.requiredQty) {
    return "Partially Issued";
  }

  return "Issued";
};

const getOrderStatus = (order: ProductionOrder): RequirementStatus => {
  const requirementStatuses = order.bom.map(getRequirementStatus);
  if (requirementStatuses.every((status) => status === "Issued")) {
    return "Issued";
  }
  if (requirementStatuses.some((status) => status === "Partially Issued")) {
    return "Partially Issued";
  }
  return "Not Issued";
};

const formatKg = (value: number) => `${value.toFixed(2)} kg`;

const requirementStatusBadge = (status: RequirementStatus) => {
  switch (status) {
    case "Not Issued":
      return "bg-gray-100 text-gray-800";
    case "Partially Issued":
      return "bg-yellow-100 text-yellow-800";
    case "Issued":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const orderStatusBadge = (status: RequirementStatus) => {
  switch (status) {
    case "Not Issued":
      return "bg-gray-100 text-gray-800";
    case "Partially Issued":
      return "bg-blue-100 text-blue-800";
    case "Issued":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const initialOrders: ProductionOrder[] = [
  {
    id: "po-2024-001",
    orderNumber: "PO-2024-001",
    buyer: "Acme Sportswear",
    floor: "Knitting Floor",
    styleCode: "KS-1001",
    scheduledDate: "2024-01-20",
    notes: "Priority order for next week shipment",
    bom: [
      {
        id: "req-1",
        yarnCode: "COT-001",
        yarnName: "Cotton Yarn Premium",
        yarnType: "Cotton",
        requiredQty: 10,
        tolerancePercent: ISSUE_TOLERANCE_DEFAULT,
        shortTermAvailable: 6,
        longTermAvailable: 18,
        logs: [],
      },
      {
        id: "req-2",
        yarnCode: "POL-002",
        yarnName: "Polyester Blend Soft",
        yarnType: "Polyester",
        requiredQty: 8,
        tolerancePercent: ISSUE_TOLERANCE_DEFAULT,
        shortTermAvailable: 4,
        longTermAvailable: 12,
        logs: [
          {
            id: "log-1",
            issueDate: "2024-01-14T10:00:00Z",
            coneBarcode: "POL-002-00045",
            weightIssued: 5,
            issuedBy: "Amit Shah",
          },
        ],
      },
    ],
  },
  {
    id: "po-2024-002",
    orderNumber: "PO-2024-002",
    buyer: "Urban Athleisure",
    floor: "Knitting Floor",
    styleCode: "KN-2245",
    scheduledDate: "2024-01-22",
    notes: "Combine with Lot LT-558 for dyeing consistency",
    bom: [
      {
        id: "req-3",
        yarnCode: "VIS-010",
        yarnName: "Viscose Shine",
        yarnType: "Viscose",
        requiredQty: 12,
        tolerancePercent: ISSUE_TOLERANCE_DEFAULT,
        shortTermAvailable: 9,
        longTermAvailable: 6,
        logs: [],
      },
      {
        id: "req-4",
        yarnCode: "NYL-004",
        yarnName: "Nylon Core Thread",
        yarnType: "Nylon",
        requiredQty: 5,
        tolerancePercent: ISSUE_TOLERANCE_DEFAULT,
        shortTermAvailable: 3,
        longTermAvailable: 8,
        logs: [],
      },
    ],
  },
  {
    id: "po-2024-003",
    orderNumber: "PO-2024-003",
    buyer: "Zen Athletica",
    floor: "Linking Floor",
    styleCode: "LK-5520",
    scheduledDate: "2024-01-18",
    notes: "Already issued last week",
    bom: [
      {
        id: "req-5",
        yarnCode: "MER-015",
        yarnName: "Merino Wool 30s",
        yarnType: "Wool",
        requiredQty: 6,
        tolerancePercent: ISSUE_TOLERANCE_DEFAULT,
        shortTermAvailable: 0,
        longTermAvailable: 4,
        logs: [
          {
            id: "log-2",
            issueDate: "2024-01-10T12:30:00Z",
            coneBarcode: "MER-015-0234",
            weightIssued: 6,
            issuedBy: "Priya Patel",
          },
        ],
      },
    ],
  },
];

const YarnIssuePage = () => {
  const { hasSubPermission, isLoading } = useNavigation();
  const [orders, setOrders] = useState<ProductionOrder[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeRequirementId, setActiveRequirementId] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [awaitingWeight, setAwaitingWeight] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [sortField, setSortField] = useState<YarnSortField>("yarnName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const hasPermission = hasSubPermission("/yarn-management", "Yarn Issue");

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      if (getOrderStatus(order) === "Issued") {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.buyer.toLowerCase().includes(query) ||
        order.floor.toLowerCase().includes(query) ||
        order.styleCode.toLowerCase().includes(query)
      );
    });
  }, [orders, searchTerm]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId(null);
      return;
    }

    if (!selectedOrderId || !filteredOrders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder = useMemo(
    () => filteredOrders.find((order) => order.id === selectedOrderId) ?? null,
    [filteredOrders, selectedOrderId]
  );

  useEffect(() => {
    if (!selectedOrder) {
      setActiveRequirementId(null);
      return;
    }

    if (
      !activeRequirementId ||
      !selectedOrder.bom.some((requirement) => requirement.id === activeRequirementId)
    ) {
      setActiveRequirementId(selectedOrder.bom[0]?.id ?? null);
    }
  }, [selectedOrder, activeRequirementId]);

  const activeRequirement = useMemo(() => {
    if (!selectedOrder || !activeRequirementId) {
      return null;
    }
    return selectedOrder.bom.find((requirement) => requirement.id === activeRequirementId) ?? null;
  }, [selectedOrder, activeRequirementId]);

  const sortedRequirements = useMemo(() => {
    if (!selectedOrder) {
      return [];
    }

    const data = [...selectedOrder.bom];

    data.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortField) {
        case "yarnName":
          aValue = a.yarnName;
          bValue = b.yarnName;
          break;
        case "yarnCode":
          aValue = a.yarnCode;
          bValue = b.yarnCode;
          break;
        case "requiredQty":
          aValue = a.requiredQty;
          bValue = b.requiredQty;
          break;
        case "issuedQty":
          aValue = getIssuedQty(a);
          bValue = getIssuedQty(b);
          break;
        case "shortTermAvailable":
          aValue = a.shortTermAvailable;
          bValue = b.shortTermAvailable;
          break;
        case "longTermAvailable":
          aValue = a.longTermAvailable;
          bValue = b.longTermAvailable;
          break;
        case "status":
          aValue = getRequirementStatus(a);
          bValue = getRequirementStatus(b);
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        const compare = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return sortDirection === "asc" ? compare : -compare;
      }

      const compareNumber = Number(aValue) - Number(bValue);
      return sortDirection === "asc" ? compareNumber : -compareNumber;
    });

    return data;
  }, [selectedOrder, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: YarnSortField }) => {
    if (sortField !== field) {
      return <i className="ri-arrow-up-down-line text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <i className="ri-arrow-up-line text-primary" />
    ) : (
      <i className="ri-arrow-down-line text-primary" />
    );
  };

  const handleSort = (field: YarnSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const resetScanState = () => {
    setBarcodeInput("");
    setWeightInput("");
    setAwaitingWeight(false);
  };

  const handleStartIssuing = (requirementId: string) => {
    setActiveRequirementId(requirementId);
    resetScanState();
  };

  const handleBarcodeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!barcodeInput.trim()) {
      toast.error("Scan the cone barcode before proceeding.");
      return;
    }

    setAwaitingWeight(true);
    toast.success("Barcode captured. Place the cone on the weight scale.");
  };

  const handleIssueSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOrder || !activeRequirement) {
      toast.error("Select a yarn requirement to issue yarn.");
      return;
    }

    const parsedWeight = parseFloat(weightInput);
    if (!barcodeInput.trim()) {
      toast.error("Scan the cone barcode before recording weight.");
      return;
    }

    if (Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      toast.error("Enter a valid weight reading from the scale.");
      return;
    }

    const currentIssued = getIssuedQty(activeRequirement);
    const maxAllowed = activeRequirement.requiredQty * (1 + activeRequirement.tolerancePercent);
    if (currentIssued + parsedWeight > maxAllowed + 0.0001) {
      toast.error(
        `Cannot issue more than ${formatKg(maxAllowed)} for ${activeRequirement.yarnName}.`
      );
      return;
    }

    let updatedShortTerm = activeRequirement.shortTermAvailable;
    let updatedLongTerm = activeRequirement.longTermAvailable;

    if (parsedWeight > updatedShortTerm + 0.0001) {
      const deficit = parsedWeight - updatedShortTerm;
      if (updatedLongTerm < deficit - 0.0001) {
        toast.error("Insufficient stock in long-term storage to cover the shortage.");
        return;
      }

      const confirmed = window.confirm(
        `Short-term storage is short by ${formatKg(deficit)}. Transfer from long-term storage?`
      );

      if (!confirmed) {
        toast("Internal transfer cancelled.");
        return;
      }

      updatedLongTerm -= deficit;
      updatedShortTerm += deficit;
      toast.success(
        `Internal stock transfer recorded. ${formatKg(deficit)} moved to short-term storage.`
      );
    }

    updatedShortTerm -= parsedWeight;

    const newLog: IssueLog = {
      id: crypto.randomUUID(),
      issueDate: new Date().toISOString(),
      coneBarcode: barcodeInput.trim(),
      weightIssued: parseFloat(parsedWeight.toFixed(3)),
      issuedBy: "System User",
    };

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== selectedOrder.id) {
          return order;
        }

        return {
          ...order,
          bom: order.bom.map((requirement) => {
            if (requirement.id !== activeRequirement.id) {
              return requirement;
            }

            return {
              ...requirement,
              shortTermAvailable: Math.max(updatedShortTerm, 0),
              longTermAvailable: Math.max(updatedLongTerm, 0),
              logs: [...requirement.logs, newLog],
            };
          }),
        };
      })
    );

    const updatedTotal = currentIssued + parsedWeight;
    const statusAfterIssue = updatedTotal + 0.0001 >= activeRequirement.requiredQty ? "Issued" : "Partially Issued";

    toast.success(
      `${formatKg(parsedWeight)} issued from short-term storage. Status: ${statusAfterIssue}.`
    );

    resetScanState();
  };

  // Show loading state while permissions are being loaded
  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Yarn Issue.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Yarn Issue" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <div className="box">
            <div className="box-header flex justify-between items-center">
              <h2 className="box-title">Production Orders</h2>
              <span className="text-xs text-gray-500">
                {filteredOrders.length} pending
              </span>
            </div>
            <div className="box-body">
              <div className="relative mb-4">
                <input
                  type="text"
                  className="form-control ps-10"
                  placeholder="Search by order, buyer, floor..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="ri-inbox-line text-4xl text-gray-400 mb-2"></i>
                  <p>No production orders need yarn issuance.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => {
                    const status = getOrderStatus(order);
                    const issuedTotals = order.bom.reduce(
                      (acc, requirement) => {
                        const issued = getIssuedQty(requirement);
                        return {
                          issued: acc.issued + issued,
                          required: acc.required + requirement.requiredQty,
                        };
                      },
                      { issued: 0, required: 0 }
                    );

                    return (
                      <button
                        key={order.id}
                        className={`w-full text-left border rounded-md px-4 py-3 transition ${
                          selectedOrder?.id === order.id
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-gray-200 hover:border-primary/60"
                        }`}
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">
                              {order.orderNumber}
                            </h3>
                            <p className="text-xs text-gray-500">{order.buyer}</p>
                          </div>
                          <span
                            className={`inline-flex px-2 py-1 text-[11px] font-semibold rounded-full ${orderStatusBadge(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <i className="ri-store-3-line"></i>
                            {order.floor}
                          </div>
                          <div className="flex items-center gap-2">
                            <i className="ri-calendar-line"></i>
                            {new Date(order.scheduledDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          <span className="font-medium text-gray-700">
                            {issuedTotals.issued.toFixed(2)} / {issuedTotals.required.toFixed(2)} kg
                          </span>{" "}
                          issued
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Need help?</h3>
            </div>
            <div className="box-body text-sm text-gray-600 space-y-2">
              <p>
                Yarn is issued only from short-term storage. When stock is short, confirm the
                transfer prompt to move cones from long-term storage before issuing.
              </p>
              <p>
                Keep the cone on the weight scale right after scanning the barcode. The system uses
                the live weight reading to log issuance activity automatically.
              </p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          {!selectedOrder ? (
            <div className="box">
              <div className="box-body text-center py-16 text-gray-500">
                <i className="ri-archive-line text-5xl text-gray-300 mb-4"></i>
                <p>Select a production order to view its yarn requirements.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="box">
                <div className="box-header flex justify-between items-start gap-4">
                  <div>
                    <h2 className="box-title text-xl">{selectedOrder.orderNumber}</h2>
                    <p className="text-sm text-gray-500">
                      {selectedOrder.buyer} • {selectedOrder.styleCode}
                    </p>
                  </div>
                  <div className="text-end text-sm text-gray-500">
                    <div className="flex items-center gap-2 justify-end">
                      <i className="ri-store-3-line"></i>
                      {selectedOrder.floor}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <i className="ri-calendar-check-line"></i>
                      Scheduled:{" "}
                      {new Date(selectedOrder.scheduledDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="box-body border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
                    <i className="ri-information-line text-primary me-1"></i>
                    {selectedOrder.notes}
                  </div>
                )}
              </div>

              <div className="box">
                <div className="box-header flex justify-between items-center">
                  <h3 className="box-title">Bill of Material Yarn Requirements</h3>
                  <span className="text-xs text-gray-500">
                    {selectedOrder.bom.length} yarn types
                  </span>
                </div>
                <div className="box-body">
                  {sortedRequirements.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <i className="ri-stack-line text-4xl text-gray-400 mb-2"></i>
                      <p>No yarn requisition configured in BOM.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                              onClick={() => handleSort("yarnName")}
                            >
                              <div className="flex items-center gap-2">
                                Yarn Description
                                <SortIcon field="yarnName" />
                              </div>
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                              onClick={() => handleSort("requiredQty")}
                            >
                              <div className="flex items-center gap-2">
                                Required
                                <SortIcon field="requiredQty" />
                              </div>
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                              onClick={() => handleSort("issuedQty")}
                            >
                              <div className="flex items-center gap-2">
                                Issued
                                <SortIcon field="issuedQty" />
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                              Remaining
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                              onClick={() => handleSort("shortTermAvailable")}
                            >
                              <div className="flex items-center gap-2">
                                Short-Term
                                <SortIcon field="shortTermAvailable" />
                              </div>
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                              onClick={() => handleSort("longTermAvailable")}
                            >
                              <div className="flex items-center gap-2">
                                Long-Term
                                <SortIcon field="longTermAvailable" />
                              </div>
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                              onClick={() => handleSort("status")}
                            >
                              <div className="flex items-center gap-2">
                                Status
                                <SortIcon field="status" />
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {sortedRequirements.map((requirement) => {
                            const issuedQty = getIssuedQty(requirement);
                            const remaining = Math.max(
                              requirement.requiredQty - issuedQty,
                              0
                            );
                            const status = getRequirementStatus(requirement);
                            const isActive = activeRequirementId === requirement.id;

                            return (
                              <tr
                                key={requirement.id}
                                className={`hover:bg-gray-50 transition-colors ${
                                  isActive ? "bg-primary/5" : ""
                                }`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                                  <div className="text-sm font-medium text-gray-900">
                                    {requirement.yarnName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {requirement.yarnCode} • {requirement.yarnType}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                                  {formatKg(requirement.requiredQty)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                                  <span className="font-medium text-blue-600">
                                    {formatKg(issuedQty)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {" "}
                                    / {formatKg(requirement.requiredQty)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                                  {formatKg(remaining)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                                  {formatKg(requirement.shortTermAvailable)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                                  {formatKg(requirement.longTermAvailable)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${requirementStatusBadge(
                                      status
                                    )}`}
                                  >
                                    {status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-300">
                                  <button
                                    className={`ti-btn w-full md:w-auto whitespace-normal break-words leading-tight px-4 py-2 text-sm ${
                                      isActive
                                        ? "ti-btn-primary"
                                        : "ti-btn-primary ti-btn-outline"
                                    }`}
                                    onClick={() => handleStartIssuing(requirement.id)}
                                  >
                                    Issue Yarn
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="box">
                  <div className="box-header">
                    <h3 className="box-title">Scan &amp; Issue</h3>
                  </div>
                  <div className="box-body">
                    {!activeRequirement ? (
                      <div className="text-center py-12 text-sm text-gray-500">
                        <i className="ri-focus-2-line text-4xl text-gray-300 mb-2"></i>
                        <p>Select a yarn item to start issuing.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border border-dashed border-primary/40 rounded-md p-4 bg-primary/5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {activeRequirement.yarnName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {activeRequirement.yarnCode} • {activeRequirement.yarnType}
                              </p>
                            </div>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${requirementStatusBadge(
                                getRequirementStatus(activeRequirement)
                              )}`}
                            >
                              {getRequirementStatus(activeRequirement)}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-white rounded p-3 border border-gray-100">
                              <p className="text-gray-500">Required</p>
                              <p className="text-sm font-medium text-gray-900">
                                {formatKg(activeRequirement.requiredQty)}
                              </p>
                            </div>
                            <div className="bg-white rounded p-3 border border-gray-100">
                              <p className="text-gray-500">Issued</p>
                              <p className="text-sm font-medium text-blue-600">
                                {formatKg(getIssuedQty(activeRequirement))}
                              </p>
                            </div>
                            <div className="bg-white rounded p-3 border border-gray-100">
                              <p className="text-gray-500">Short-Term Available</p>
                              <p className="text-sm font-medium text-green-600">
                                {formatKg(activeRequirement.shortTermAvailable)}
                              </p>
                            </div>
                            <div className="bg-white rounded p-3 border border-gray-100">
                              <p className="text-gray-500">Long-Term Available</p>
                              <p className="text-sm font-medium text-orange-600">
                                {formatKg(activeRequirement.longTermAvailable)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <form onSubmit={handleBarcodeSubmit} className="space-y-2">
                          <label className="form-label text-sm font-semibold text-gray-700">
                            1. Scan Cone Barcode
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              className="form-control ps-10"
                              placeholder="Scan or enter cone barcode"
                              value={barcodeInput}
                              onChange={(event) => setBarcodeInput(event.target.value)}
                              disabled={awaitingWeight}
                            />
                            <i className="ri-barcode-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                          </div>
                          <button
                            type="submit"
                            className="ti-btn ti-btn-primary w-full sm:w-auto whitespace-normal break-words leading-tight px-4 py-2 text-sm"
                            disabled={awaitingWeight}
                          >
                            Capture Barcode
                          </button>
                        </form>

                        <form onSubmit={handleIssueSubmit} className="space-y-2">
                          <label className="form-label text-sm font-semibold text-gray-700">
                            2. Capture Weight Reading
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-control ps-10"
                              placeholder="Weight in kg from scale"
                              value={weightInput}
                              onChange={(event) => setWeightInput(event.target.value)}
                              disabled={!awaitingWeight}
                            />
                            <i className="ri-scales-3-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                          </div>
                          <button
                            type="submit"
                            className="ti-btn ti-btn-success w-full sm:w-auto whitespace-normal break-words leading-tight px-4 py-2 text-sm"
                            disabled={!awaitingWeight}
                          >
                            Log Issued Weight
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>

                <div className="box">
                  <div className="box-header flex justify-between items-center">
                    <h3 className="box-title">Issue Activity Log</h3>
                    {activeRequirement && (
                      <span className="text-xs text-gray-500">
                        {activeRequirement.logs.length} entries
                      </span>
                    )}
                  </div>
                  <div className="box-body">
                    {!activeRequirement || activeRequirement.logs.length === 0 ? (
                      <div className="text-center py-12 text-sm text-gray-500">
                        <i className="ri-timeline-line text-4xl text-gray-300 mb-2"></i>
                        <p>No yarn issued for this item yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-200">
                                Timestamp
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-200">
                                Barcode
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-200">
                                Weight Issued
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                Issued By
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {activeRequirement.logs
                              .slice()
                              .reverse()
                              .map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 transition">
                                  <td className="px-4 py-2 text-sm text-gray-900 border-r border-b border-gray-200">
                                    {new Date(log.issueDate).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 border-r border-b border-gray-200">
                                    {log.coneBarcode}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 border-r border-b border-gray-200">
                                    {formatKg(log.weightIssued)}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900 border-b border-gray-200">
                                    {log.issuedBy}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default YarnIssuePage;
