"use client";
import React, {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

type ConeStatus = "Awaiting" | "Returned";
type OrderStatus = "Awaiting Return" | "In Progress" | "Partial" | "Returned";
type ReturnStatus = "Awaiting" | "Partial" | "Returned";

interface Cone {
  id: string;
  barcode: string;
  yarnCode: string;
  yarnName: string;
  yarnType: string;
  issuedWeight: number;
  returnedWeight?: number;
  balanceWeight?: number;
  status: ConeStatus;
  lastReturnedAt?: string;
}

interface ProductionOrder {
  id: string;
  productionOrder: string;
  floor: string;
  knittingSupervisor: string;
  knittingCompletedAt: string;
  status: OrderStatus;
  cones: Cone[];
  lastUpdated: string;
}

interface ReturnRecord {
  id: string;
  orderId: string;
  productionOrder: string;
  knittingCompletedAt: string;
  status: ReturnStatus;
  returnedCones: number;
  pendingCones: number;
  lastUpdated: string;
}

const FLOORS = [
  "Knitting Floor",
  "Linking Floor",
  "Checking Floor",
  "Washing Floor",
  "Boarding Floor",
  "Branding Floor",
  "Final Checking Floor",
  "Machine Floor",
  "Warehouse Floor",
];

const getOrderStatusFromCones = (cones: Cone[]): OrderStatus => {
  const returned = cones.filter((cone) => cone.status === "Returned").length;
  if (returned === cones.length) {
    return "Returned";
  }
  if (returned > 0) {
    return "Partial";
  }
  return "Awaiting Return";
};

const buildHistoryRecord = (order: ProductionOrder): ReturnRecord => {
  const returnedCones = order.cones.filter(
    (cone) => cone.status === "Returned"
  ).length;
  const pendingCones = order.cones.length - returnedCones;
  let status: ReturnStatus = "Awaiting";
  if (order.status === "Returned") {
    status = "Returned";
  } else if (returnedCones > 0) {
    status = "Partial";
  }
  return {
    id: order.id,
    orderId: order.id,
    productionOrder: order.productionOrder,
    knittingCompletedAt: order.knittingCompletedAt,
    status,
    returnedCones,
    pendingCones,
    lastUpdated: order.lastUpdated,
  };
};

const SAMPLE_ORDERS: ProductionOrder[] = [
  {
    id: "order-1",
    productionOrder: "PO-2024-001",
    floor: "Knitting Floor",
    knittingSupervisor: "Ravi Verma",
    knittingCompletedAt: "2024-01-20T09:00:00Z",
    status: "Awaiting Return",
    lastUpdated: "2024-01-20T09:00:00Z",
    cones: [
      {
        id: "cone-001",
        barcode: "CON-PO1-001",
        yarnCode: "COT-001",
        yarnName: "Cotton Yarn Premium",
        yarnType: "Cotton",
        issuedWeight: 1.2,
        status: "Awaiting",
      },
      {
        id: "cone-002",
        barcode: "CON-PO1-002",
        yarnCode: "COT-001",
        yarnName: "Cotton Yarn Premium",
        yarnType: "Cotton",
        issuedWeight: 1.18,
        status: "Awaiting",
      },
      {
        id: "cone-003",
        barcode: "CON-PO1-003",
        yarnCode: "COT-001",
        yarnName: "Cotton Yarn Premium",
        yarnType: "Cotton",
        issuedWeight: 1.22,
        status: "Awaiting",
      },
    ],
  },
  {
    id: "order-2",
    productionOrder: "PO-2024-002",
    floor: "Linking Floor",
    knittingSupervisor: "Priya Nair",
    knittingCompletedAt: "2024-01-19T18:30:00Z",
    status: "Partial",
    lastUpdated: "2024-01-19T19:15:00Z",
    cones: [
      {
        id: "cone-004",
        barcode: "CON-PO2-001",
        yarnCode: "POL-002",
        yarnName: "Polyester Blend",
        yarnType: "Polyester",
        issuedWeight: 1.0,
        status: "Returned",
        returnedWeight: 0.15,
        balanceWeight: 0.85,
        lastReturnedAt: "2024-01-19T19:10:00Z",
      },
      {
        id: "cone-005",
        barcode: "CON-PO2-002",
        yarnCode: "POL-002",
        yarnName: "Polyester Blend",
        yarnType: "Polyester",
        issuedWeight: 1.05,
        status: "Awaiting",
      },
      {
        id: "cone-006",
        barcode: "CON-PO2-003",
        yarnCode: "POL-002",
        yarnName: "Polyester Blend",
        yarnType: "Polyester",
        issuedWeight: 0.98,
        status: "Awaiting",
      },
    ],
  },
  {
    id: "order-3",
    productionOrder: "PO-2024-003",
    floor: "Checking Floor",
    knittingSupervisor: "Sunil Iyer",
    knittingCompletedAt: "2024-01-18T15:00:00Z",
    status: "Returned",
    lastUpdated: "2024-01-18T17:45:00Z",
    cones: [
      {
        id: "cone-007",
        barcode: "CON-PO3-001",
        yarnCode: "VIS-003",
        yarnName: "Viscose Rayon",
        yarnType: "Viscose",
        issuedWeight: 1.1,
        status: "Returned",
        returnedWeight: 0.2,
        balanceWeight: 0.9,
        lastReturnedAt: "2024-01-18T16:15:00Z",
      },
      {
        id: "cone-008",
        barcode: "CON-PO3-002",
        yarnCode: "VIS-003",
        yarnName: "Viscose Rayon",
        yarnType: "Viscose",
        issuedWeight: 1.12,
        status: "Returned",
        returnedWeight: 0.18,
        balanceWeight: 0.94,
        lastReturnedAt: "2024-01-18T16:35:00Z",
      },
      {
        id: "cone-009",
        barcode: "CON-PO3-003",
        yarnCode: "VIS-003",
        yarnName: "Viscose Rayon",
        yarnType: "Viscose",
        issuedWeight: 1.09,
        status: "Returned",
        returnedWeight: 0.2,
        balanceWeight: 0.89,
        lastReturnedAt: "2024-01-18T16:55:00Z",
      },
    ],
  },
];

const statusBadgeColor = (status: ReturnStatus | OrderStatus) => {
  switch (status) {
    case "Awaiting":
    case "Awaiting Return":
      return "bg-yellow-100 text-yellow-800";
    case "In Progress":
      return "bg-blue-100 text-blue-800";
    case "Partial":
      return "bg-orange-100 text-orange-800";
    case "Returned":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const YarnReturnPage = () => {
  const { hasSubPermission, isLoading } = useNavigation();

  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [history, setHistory] = useState<ReturnRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [activeConeId, setActiveConeId] = useState<string | null>(null);
  const [scaleWeight, setScaleWeight] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] =
    useState<ReturnStatus | "all">("all");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyDateRange, setHistoryDateRange] = useState<{
    from: string;
    to: string;
  }>({ from: "", to: "" });

  const pendingToastShown = useRef(false);

  useEffect(() => {
    const seeded = SAMPLE_ORDERS.map((order) => ({
      ...order,
      status:
        order.status === "Returned"
          ? "Returned"
          : getOrderStatusFromCones(order.cones),
    }));
    setOrders(seeded);
    setHistory(seeded.map((order) => buildHistoryRecord(order)));
  }, []);

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status !== "Returned"),
    [orders]
  );

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const totalPendingCones = useMemo(
    () =>
      pendingOrders.reduce(
        (sum, order) =>
          sum +
          order.cones.filter((cone) => cone.status !== "Returned").length,
        0
      ),
    [pendingOrders]
  );

  const totalCompletedOrders = useMemo(
    () => orders.filter((order) => order.status === "Returned").length,
    [orders]
  );

  useEffect(() => {
    if (!pendingToastShown.current && pendingOrders.length > 0) {
      pendingToastShown.current = true;
      toast("Knitting completed orders are awaiting cone return.", {
        icon: "🧵",
      });
    }
  }, [pendingOrders]);

  const hasPermission = hasSubPermission("/yarn-management", "Yarn Return");

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
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-500 mb-4">
            You don&apos;t have permission to access Yarn Return.
          </p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  const upsertHistoryRecord = (order: ProductionOrder) => {
    const record = buildHistoryRecord(order);
    setHistory((prev) => {
      const index = prev.findIndex((item) => item.orderId === order.id);
      if (index === -1) {
        return [...prev, record];
      }
      const copy = [...prev];
      copy[index] = record;
      return copy;
    });
  };

  const handleReturnConesClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setScanValue("");
    setActiveConeId(null);
    setScaleWeight("");
  };

  const handleBackToList = () => {
    setSelectedOrderId(null);
    setScanValue("");
    setActiveConeId(null);
    setScaleWeight("");
  };

  const handleBarcodeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrder) {
      toast.error("Select a production order to continue.");
      return;
    }

    const value = scanValue.trim();
    if (!value) {
      toast.error("Scan a cone barcode to continue.");
      return;
    }

    const cone =
      selectedOrder.cones.find(
        (item) => item.barcode.toLowerCase() === value.toLowerCase()
      ) ?? null;

    if (!cone) {
      toast.error("No cone found for scanned barcode.");
      return;
    }

    if (cone.status === "Returned") {
      toast("This cone has already been marked as returned.", {
        icon: "ℹ️",
      });
      setScanValue("");
      setActiveConeId(null);
      setScaleWeight("");
      return;
    }

    setActiveConeId(cone.id);
    setScaleWeight("");
    toast.success(
      `${cone.barcode} ready. Place the cone on the weight scale to capture balance.`
    );
  };

  const handleWeightCapture = () => {
    if (!selectedOrder || !activeConeId) {
      toast.error("Scan a cone before capturing weight.");
      return;
    }

    const parsedWeight = Number(scaleWeight);
    if (!scaleWeight || Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      toast.error("Enter a valid captured weight in kilograms.");
      return;
    }

    const updatedOrders = orders.map((order) => {
      if (order.id !== selectedOrder.id) {
        return order;
      }

      const updatedCones = order.cones.map((cone) => {
        if (cone.id !== activeConeId) {
          return cone;
        }
        const balance = Math.max(cone.issuedWeight - parsedWeight, 0);
        return {
          ...cone,
          returnedWeight: parsedWeight,
          balanceWeight: balance,
          status: "Returned" as ConeStatus,
          lastReturnedAt: new Date().toISOString(),
        };
      });

      const returnedCount = updatedCones.filter(
        (cone) => cone.status === "Returned"
      ).length;
      let status: OrderStatus = "In Progress";
      if (returnedCount === updatedCones.length) {
        status = "Returned";
      } else if (returnedCount > 0) {
        status = "Partial";
      } else {
        status = "Awaiting Return";
      }

      return {
        ...order,
        cones: updatedCones,
        status,
        lastUpdated: new Date().toISOString(),
      };
    });

    setOrders(updatedOrders);
    const updatedOrder =
      updatedOrders.find((order) => order.id === selectedOrder.id) ?? null;

    if (updatedOrder) {
      upsertHistoryRecord(updatedOrder);

      if (updatedOrder.status === "Returned") {
        toast.success(
          `All cones returned for ${updatedOrder.productionOrder}. Production order is now cleared.`
        );
        setSelectedOrderId(null);
      } else {
        toast.success("Cone marked returned. Continue with the remaining cones.");
      }
    }

    setActiveConeId(null);
    setScaleWeight("");
    setScanValue("");
  };

  const filteredHistory = useMemo(() => {
    return history
      .filter((record) => {
        if (
          historySearchTerm &&
          !record.productionOrder
            .toLowerCase()
            .includes(historySearchTerm.toLowerCase())
        ) {
          return false;
        }
        if (historyStatusFilter !== "all" && record.status !== historyStatusFilter) {
          return false;
        }
        if (historyDateRange.from) {
          const fromDate = new Date(historyDateRange.from);
          if (new Date(record.lastUpdated) < fromDate) {
            return false;
          }
        }
        if (historyDateRange.to) {
          const toDate = new Date(historyDateRange.to);
          const recordDate = new Date(record.lastUpdated);
          recordDate.setHours(0, 0, 0, 0);
          if (recordDate > toDate) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.lastUpdated).getTime() -
          new Date(a.lastUpdated).getTime()
      );
  }, [history, historyDateRange.from, historyDateRange.to, historySearchTerm, historyStatusFilter]);

  return (
    <div className="main-content">
      <Seo title="Yarn Return" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">
                  Yarn Return
                </h1>
                <p className="text-gray-600 mt-1">
                  Track knitting completion and ensure cones are returned to the
                  warehouse.
                </p>
              </div>
              {selectedOrder ? (
                <button
                  className="ti-btn ti-btn-outline"
                  onClick={handleBackToList}
                >
                  <i className="ri-arrow-left-line me-2"></i>
                  Back to Pending Orders
                </button>
              ) : null}
            </div>
          </div>

          {!selectedOrder && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="box">
                  <div className="box-body text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {pendingOrders.length}
                    </div>
                    <div className="text-sm text-gray-600">
                      Orders Awaiting Cone Return
                    </div>
                  </div>
                </div>
                <div className="box">
                  <div className="box-body text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {totalPendingCones}
                    </div>
                    <div className="text-sm text-gray-600">
                      Cones Pending Return
                    </div>
                  </div>
                </div>
                <div className="box">
                  <div className="box-body text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {totalCompletedOrders}
                    </div>
                    <div className="text-sm text-gray-600">
                      Orders Cleared
                    </div>
                  </div>
                </div>
              </div>

              <div className="box">
                <div className="box-header">
                  <h3 className="box-title">
                    Pending Cone Returns ({pendingOrders.length})
                  </h3>
                </div>
                <div className="box-body">
                  {pendingOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-4">
                        <i className="ri-checkbox-circle-line text-4xl"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        All caught up!
                      </h3>
                      <p className="text-gray-500">
                        There are no knitting-complete orders awaiting cone
                        return.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                              Production Order
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                              Floor
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                              Knitting Completed
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                              Supervisor
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                              Cones
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {pendingOrders.map((order) => {
                            const returned = order.cones.filter(
                              (cone) => cone.status === "Returned"
                            ).length;
                            return (
                              <tr
                                key={order.id}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-b border-gray-300">
                                  {order.productionOrder}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                                  {order.floor}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                                  {new Date(
                                    order.knittingCompletedAt
                                  ).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                                  {order.knittingSupervisor}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                                  {returned}/{order.cones.length}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeColor(
                                      order.status
                                    )}`}
                                  >
                                    {order.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium border-b border-gray-300">
                                  <button
                                    className="ti-btn ti-btn-primary"
                                    onClick={() =>
                                      handleReturnConesClick(order.id)
                                    }
                                  >
                                    <i className="ri-reply-line me-2"></i>
                                    Return Cones
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
            </>
          )}

          {selectedOrder && (
            <div className="space-y-6">
              <div className="box !border-primary">
                <div className="box-header flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="box-title text-xl font-semibold">
                      {selectedOrder.productionOrder} &mdash; Cone Return
                    </h3>
                    <p className="text-gray-500">
                      Knitting completed on{" "}
                      {new Date(
                        selectedOrder.knittingCompletedAt
                      ).toLocaleString()}{" "}
                      &middot; Supervisor:{" "}
                      <span className="font-medium">
                        {selectedOrder.knittingSupervisor}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusBadgeColor(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <div className="box-body space-y-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
                    <h4 className="text-sm font-semibold text-primary mb-2">
                      Return Procedure
                    </h4>
                    <ol className="list-decimal list-inside text-sm text-primary/70 space-y-1">
                      <li>Scan the barcode on the empty cone.</li>
                      <li>
                        Place the cone on the weight scale when prompted to
                        capture balance.
                      </li>
                      <li>
                        Confirm the captured weight to mark the cone as
                        returned.
                      </li>
                    </ol>
                  </div>

                  <form
                    onSubmit={handleBarcodeSubmit}
                    className="flex flex-col md:flex-row gap-3"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Scan or enter cone barcode..."
                        value={scanValue}
                        onChange={(event) => setScanValue(event.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="ti-btn ti-btn-primary">
                        <i className="ri-focus-2-line me-2"></i>
                        Scan Cone
                      </button>
                      <button
                        type="button"
                        className="ti-btn ti-btn-outline"
                        onClick={() => {
                          setScanValue("");
                          setActiveConeId(null);
                          setScaleWeight("");
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  </form>

                  {activeConeId ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex flex-col md:flex-row md:items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-blue-700 mb-1">
                          Captured Weight (kg)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control"
                          value={scaleWeight}
                          onChange={(event) => setScaleWeight(event.target.value)}
                          placeholder="Weight captured from scale"
                        />
                      </div>
                      <button
                        type="button"
                        className="ti-btn ti-btn-success md:w-auto"
                        onClick={handleWeightCapture}
                      >
                        <i className="ri-scales-3-line me-2"></i>
                        Save Weight
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-200 rounded-md p-4 text-sm text-gray-500">
                      Scan a cone to capture the balance weight.
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                            Cone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                            Yarn
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                            Issued Weight (kg)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                            Captured Weight (kg)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                            Balance (kg)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {selectedOrder.cones.map((cone) => (
                          <tr
                            key={cone.id}
                            className={`${
                              activeConeId === cone.id
                                ? "bg-blue-50"
                                : cone.status === "Returned"
                                ? "bg-green-50/50"
                                : ""
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-b border-gray-300">
                              {cone.barcode}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {cone.yarnName}
                                </span>
                                <span className="text-gray-500 text-xs">
                                  {cone.yarnCode} &middot; {cone.yarnType}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                              {cone.issuedWeight.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                              {cone.returnedWeight !== undefined
                                ? cone.returnedWeight.toFixed(2)
                                : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                              {cone.balanceWeight !== undefined
                                ? cone.balanceWeight.toFixed(2)
                                : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-b border-gray-300">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeColor(
                                  cone.status === "Returned"
                                    ? "Returned"
                                    : "Awaiting"
                                )}`}
                              >
                                {cone.status === "Returned"
                                  ? "Returned"
                                  : "Awaiting"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="box">
            <div className="box-header flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h3 className="box-title">Return History &amp; Tracking</h3>
              <div className="flex flex-wrap gap-3 md:items-center">
                <input
                  type="text"
                  className="form-control md:w-48"
                  placeholder="Search order..."
                  value={historySearchTerm}
                  onChange={(event) => setHistorySearchTerm(event.target.value)}
                />
                <select
                  className="form-select md:w-40"
                  value={historyStatusFilter}
                  onChange={(event) =>
                    setHistoryStatusFilter(event.target.value as ReturnStatus | "all")
                  }
                >
                  <option value="all">All Status</option>
                  <option value="Awaiting">Awaiting</option>
                  <option value="Partial">Partial</option>
                  <option value="Returned">Returned</option>
                </select>
                <input
                  type="date"
                  className="form-control md:w-40"
                  value={historyDateRange.from}
                  onChange={(event) =>
                    setHistoryDateRange((prev) => ({
                      ...prev,
                      from: event.target.value,
                    }))
                  }
                />
                <input
                  type="date"
                  className="form-control md:w-40"
                  value={historyDateRange.to}
                  onChange={(event) =>
                    setHistoryDateRange((prev) => ({
                      ...prev,
                      to: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="box-body">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-time-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Records
                  </h3>
                  <p className="text-gray-500">
                    Adjust your filters or process cone returns to see them
                    listed here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          Production Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          Knitting Completed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          Returned Cones
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          Pending Cones
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                          Last Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredHistory.map((record) => (
                        <tr
                          key={record.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-b border-gray-300">
                            {record.productionOrder}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                            {new Date(
                              record.knittingCompletedAt
                            ).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                            {record.returnedCones}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                            {record.pendingCones}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeColor(
                                record.status
                              )}`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-300">
                            {new Date(record.lastUpdated).toLocaleString()}
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
      </div>
    </div>
  );
};

export default YarnReturnPage;

