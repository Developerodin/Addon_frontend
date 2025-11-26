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
import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";

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
  transactionId?: string; // ID of the issued transaction
  yarnCatalogId?: string; // Yarn catalog ID for return transaction
}

interface Article {
  id: string;
  _id?: string;
  articleNumber: string;
  plannedQuantity: number;
  linkingType: string;
  priority: string;
  status: string;
  machineId?: any;
  remarks?: string;
}

interface ApiProductionOrder {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  currentFloor: string;
  orderNote?: string;
  articles: Article[];
  createdAt?: string;
  updatedAt?: string;
}

interface ProductionOrder {
  id: string;
  productionOrder: string;
  orderNumber: string;
  floor: string;
  knittingSupervisor: string;
  knittingCompletedAt: string;
  status: OrderStatus;
  cones: Cone[];
  lastUpdated: string;
  articles?: Article[];
  hasIssuedTransactions?: boolean; // Track if order has issued transactions
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

const getOrderStatusFromCones = (cones: Cone[]): OrderStatus => {
  if (cones.length === 0) return "Awaiting Return";
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
    productionOrder: order.productionOrder || order.orderNumber,
    knittingCompletedAt: order.knittingCompletedAt,
    status,
    returnedCones,
    pendingCones,
    lastUpdated: order.lastUpdated,
  };
};

const getAccessToken = (): string | null => {
  if (typeof document === "undefined") return null;
  try {
    const tokenFromCookie = Cookies.get("accessToken");
    if (tokenFromCookie) return tokenFromCookie;
    const tokenFromStorage = localStorage.getItem("token");
    return tokenFromStorage;
  } catch {
    return null;
  }
};

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
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const pendingToastShown = useRef(false);
  const hasPermission = hasSubPermission("/yarn-management", "Yarn Return");

  // Fetch production orders with issued yarn
  useEffect(() => {
    const fetchOrders = async () => {
      if (!hasPermission) return;
      
      setOrdersLoading(true);
      try {
        const token = getAccessToken();
        const response = await fetch(
          `${API_BASE_URL}/production/orders?page=1&limit=100&sortBy=createdAt&populate=articles`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch production orders");
        }

        const data = await response.json();
        const apiOrders: ApiProductionOrder[] = data.results || [];

        // Fetch issued transactions for each order to get cones
        const ordersWithCones = await Promise.all(
          apiOrders.map(async (order) => {
            try {
              const transactionsResponse = await fetch(
                `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-issued-by-order/${order.orderNumber}`,
                {
                  headers: {
                    "Content-Type": "application/json",
                    ...(token && { Authorization: `Bearer ${token}` }),
                  },
                }
              );

              let issuedTransactions: any[] = [];
              if (transactionsResponse.ok) {
                const transactionsData = await transactionsResponse.json();
                // Handle both array and paginated response formats
                issuedTransactions = Array.isArray(transactionsData)
                  ? transactionsData
                  : (transactionsData.results || []);
                // Filter to only yarn_issued transactions
                issuedTransactions = issuedTransactions.filter((tx: any) => tx.transactionType === "yarn_issued");
              }

              // Also fetch returned transactions to check which cones are already returned
              // Try the specific endpoint first, then fallback to querying all transactions
              let returnedTransactions: any[] = [];
              try {
                // Try specific endpoint
                const returnedResponse = await fetch(
                  `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-returned-by-order/${order.orderNumber}`,
                  {
                    headers: {
                      "Content-Type": "application/json",
                      ...(token && { Authorization: `Bearer ${token}` }),
                    },
                  }
                );
                if (returnedResponse.ok) {
                  returnedTransactions = await returnedResponse.json();
                } else {
                  // Fallback: query all transactions for this order and filter by type
                  const allTransactionsResponse = await fetch(
                    `${API_BASE_URL}/yarn-management/yarn-transactions?orderno=${order.orderNumber}`,
                    {
                      headers: {
                        "Content-Type": "application/json",
                        ...(token && { Authorization: `Bearer ${token}` }),
                      },
                    }
                  );
                  if (allTransactionsResponse.ok) {
                    const allTransactions = await allTransactionsResponse.json();
                    returnedTransactions = Array.isArray(allTransactions)
                      ? allTransactions.filter((tx: any) => tx.transactionType === "yarn_returned")
                      : (allTransactions.results || []).filter((tx: any) => tx.transactionType === "yarn_returned");
                  }
                }
              } catch (err) {
                // API might not exist yet, that's okay
                console.warn("Returned transactions API not available:", err);
              }

              // Convert transactions to cones
              const conesMap = new Map<string, Cone>();
              
              // Process issued transactions - create cones for all issued transactions
              // (already filtered to yarn_issued above, but keeping check for safety)
              issuedTransactions.forEach((tx: any) => {
                if (tx.transactionType === "yarn_issued") {
                  // Use coneBarcode if available, otherwise use transaction ID
                  const coneBarcode = tx.coneBarcode || tx.barcode || `TX-${tx._id || tx.id}`;
                  const coneId = coneBarcode;
                  
                  // Find matching returned transaction (match by coneBarcode or transaction ID)
                  const returnedTx = returnedTransactions.find(
                    (rt: any) => {
                      if (tx.coneBarcode && rt.coneBarcode) {
                        return rt.coneBarcode === tx.coneBarcode && rt.transactionType === "yarn_returned";
                      }
                      // If no coneBarcode, match by issued transaction ID
                      return rt.issuedTransactionId === (tx._id || tx.id) && rt.transactionType === "yarn_returned";
                    }
                  );

                  // Handle multiple cones in one transaction (numberOfCones > 1)
                  const numberOfCones = tx.numberOfCones || 1;
                  const weightPerCone = (tx.transactionNetWeight || tx.totalNetWeight || 0) / numberOfCones;

                  for (let i = 0; i < numberOfCones; i++) {
                    const coneIndex = numberOfCones > 1 ? i + 1 : 0;
                    const uniqueConeId = numberOfCones > 1 ? `${coneId}-${coneIndex}` : coneId;
                    const uniqueBarcode = numberOfCones > 1 ? `${coneBarcode}-${coneIndex}` : coneBarcode;

                    conesMap.set(uniqueConeId, {
                      id: uniqueConeId,
                      barcode: uniqueBarcode,
                      yarnCode: tx.yarn?.id || tx.yarn || "N/A",
                      yarnName: tx.yarnName || "Unknown Yarn",
                      yarnType: tx.yarn?.yarnType?.name || "Unknown",
                      issuedWeight: weightPerCone,
                      returnedWeight: returnedTx ? (returnedTx.transactionNetWeight || returnedTx.totalNetWeight || 0) / numberOfCones : undefined,
                      balanceWeight: returnedTx ? Math.max(
                        weightPerCone - ((returnedTx.transactionNetWeight || returnedTx.totalNetWeight || 0) / numberOfCones),
                        0
                      ) : undefined,
                      status: returnedTx ? ("Returned" as ConeStatus) : ("Awaiting" as ConeStatus),
                      lastReturnedAt: returnedTx?.transactionDate || returnedTx?.createdAt,
                      transactionId: tx._id || tx.id,
                      yarnCatalogId: tx.yarn?.id || tx.yarn,
                    });
                  }
                }
              });

              const cones = Array.from(conesMap.values());
              
              // Count issued transactions (already filtered above)
              const issuedTxCount = issuedTransactions.length;
              const hasIssued = issuedTxCount > 0;

              return {
                id: order.id,
                productionOrder: order.orderNumber,
                orderNumber: order.orderNumber,
                floor: order.currentFloor || "N/A",
                knittingSupervisor: "N/A", // Not available in API
                knittingCompletedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
                status: getOrderStatusFromCones(cones),
                cones: cones,
                lastUpdated: order.updatedAt || order.createdAt || new Date().toISOString(),
                articles: order.articles || [],
                hasIssuedTransactions: hasIssued, // Track if order has issued transactions
              };
            } catch (error) {
              console.error(`Error fetching transactions for order ${order.orderNumber}:`, error);
              return {
                id: order.id,
                productionOrder: order.orderNumber,
                orderNumber: order.orderNumber,
                floor: order.currentFloor || "N/A",
                knittingSupervisor: "N/A",
                knittingCompletedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
                status: "Awaiting Return" as OrderStatus,
                cones: [],
                lastUpdated: order.updatedAt || order.createdAt || new Date().toISOString(),
                articles: order.articles || [],
                hasIssuedTransactions: false,
              };
            }
          })
        );

        // Filter orders that have issued transactions (show all orders with issued yarn, even if 0 returned)
        const ordersWithIssuedCones = ordersWithCones.filter(
          (order) => {
            // Show orders that have issued transactions
            // This includes orders with issued yarn, even if no cones have been returned yet
            const hasIssued = (order as any).hasIssuedTransactions === true;
            const hasCones = order.cones.length > 0;
            return hasIssued || hasCones;
          }
        );
        
        console.log("Orders with issued cones:", ordersWithIssuedCones.length, ordersWithIssuedCones.map(o => ({
          orderNumber: o.orderNumber,
          hasIssuedTransactions: (o as any).hasIssuedTransactions,
          conesCount: o.cones.length
        })));

        setOrders(ordersWithIssuedCones);
        setHistory(ordersWithIssuedCones.map((order) => buildHistoryRecord(order)));
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("Failed to load production orders");
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [hasPermission]);

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

  if (isLoading || ordersLoading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
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

  const handleWeightCapture = async () => {
    if (!selectedOrder || !activeConeId) {
      toast.error("Scan a cone before capturing weight.");
      return;
    }

    const parsedWeight = Number(scaleWeight);
    if (!scaleWeight || Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      toast.error("Enter a valid captured weight in kilograms.");
      return;
    }

    const activeCone = selectedOrder.cones.find((c) => c.id === activeConeId);
    if (!activeCone) {
      toast.error("Cone not found.");
      return;
    }

    setSubmittingReturn(true);
    try {
      const token = getAccessToken();
      const transactionDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
      const balanceWeight = Math.max(activeCone.issuedWeight - parsedWeight, 0);

      const transactionData = {
        yarn: activeCone.yarnCatalogId || activeCone.yarnCode,
        yarnName: activeCone.yarnName,
        transactionType: "yarn_returned",
        transactionDate: transactionDate,
        totalWeight: parsedWeight,
        totalTearWeight: 0,
        totalNetWeight: parsedWeight,
        numberOfCones: 1,
        orderno: selectedOrder.orderNumber,
        coneBarcode: activeCone.barcode,
        balanceWeight: balanceWeight,
        issuedTransactionId: activeCone.transactionId, // Link to original issue transaction
      };

      const response = await fetch(`${API_BASE_URL}/yarn-management/yarn-transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create return transaction");
      }

      // Update local state
      const updatedOrders = orders.map((order) => {
        if (order.id !== selectedOrder.id) {
          return order;
        }

        const updatedCones = order.cones.map((cone) => {
          if (cone.id !== activeConeId) {
            return cone;
          }
          return {
            ...cone,
            returnedWeight: parsedWeight,
            balanceWeight: balanceWeight,
            status: "Returned" as ConeStatus,
            lastReturnedAt: new Date().toISOString(),
          };
        });

        const returnedCount = updatedCones.filter(
          (cone) => cone.status === "Returned"
        ).length;
        let status: OrderStatus = getOrderStatusFromCones(updatedCones);

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

        // Refetch transactions to ensure we have the latest data
        try {
          const token = getAccessToken();
          const transactionsResponse = await fetch(
            `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-issued-by-order/${selectedOrder.orderNumber}`,
            {
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            }
          );

          if (transactionsResponse.ok) {
            const issuedTransactions = await transactionsResponse.json();
            
            // Fetch returned transactions
            let returnedTransactions: any[] = [];
            try {
              const returnedResponse = await fetch(
                `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-returned-by-order/${selectedOrder.orderNumber}`,
                {
                  headers: {
                    "Content-Type": "application/json",
                    ...(token && { Authorization: `Bearer ${token}` }),
                  },
                }
              );
              if (returnedResponse.ok) {
                returnedTransactions = await returnedResponse.json();
              }
            } catch (err) {
              // Try fallback query
              try {
                const allTransactionsResponse = await fetch(
                  `${API_BASE_URL}/yarn-management/yarn-transactions?orderno=${selectedOrder.orderNumber}`,
                  {
                    headers: {
                      "Content-Type": "application/json",
                      ...(token && { Authorization: `Bearer ${token}` }),
                    },
                  }
                );
                if (allTransactionsResponse.ok) {
                  const allTransactions = await allTransactionsResponse.json();
                  returnedTransactions = Array.isArray(allTransactions)
                    ? allTransactions.filter((tx: any) => tx.transactionType === "yarn_returned")
                    : (allTransactions.results || []).filter((tx: any) => tx.transactionType === "yarn_returned");
                }
              } catch (e) {
                console.warn("Could not fetch returned transactions:", e);
              }
            }

            // Update cones with latest data
            const conesMap = new Map<string, Cone>();
            issuedTransactions.forEach((tx: any) => {
              if (tx.transactionType === "yarn_issued" && tx.coneBarcode) {
                const coneId = tx.coneBarcode || tx._id || crypto.randomUUID();
                const returnedTx = returnedTransactions.find(
                  (rt: any) => rt.coneBarcode === tx.coneBarcode && rt.transactionType === "yarn_returned"
                );

                conesMap.set(coneId, {
                  id: coneId,
                  barcode: tx.coneBarcode || tx.barcode || "N/A",
                  yarnCode: tx.yarn?.id || tx.yarn || "N/A",
                  yarnName: tx.yarnName || "Unknown Yarn",
                  yarnType: tx.yarn?.yarnType?.name || "Unknown",
                  issuedWeight: tx.transactionNetWeight || tx.totalNetWeight || 0,
                  returnedWeight: returnedTx ? (returnedTx.transactionNetWeight || returnedTx.totalNetWeight || 0) : undefined,
                  balanceWeight: returnedTx ? Math.max(
                    (tx.transactionNetWeight || tx.totalNetWeight || 0) - 
                    (returnedTx.transactionNetWeight || returnedTx.totalNetWeight || 0),
                    0
                  ) : undefined,
                  status: returnedTx ? ("Returned" as ConeStatus) : ("Awaiting" as ConeStatus),
                  lastReturnedAt: returnedTx?.transactionDate || returnedTx?.createdAt,
                  transactionId: tx._id || tx.id,
                  yarnCatalogId: tx.yarn?.id || tx.yarn,
                });
              }
            });

            const updatedCones = Array.from(conesMap.values());
            setOrders((prev) =>
              prev.map((order) => {
                if (order.id !== selectedOrder.id) {
                  return order;
                }
                return {
                  ...order,
                  cones: updatedCones,
                  status: getOrderStatusFromCones(updatedCones),
                  lastUpdated: new Date().toISOString(),
                };
              })
            );
          }
        } catch (error) {
          console.error("Error refetching transactions:", error);
          // Don't show error to user, local state is already updated
        }
      }

      setActiveConeId(null);
      setScaleWeight("");
      setScanValue("");
    } catch (error) {
      console.error("Error creating return transaction:", error);
      toast.error(error instanceof Error ? error.message : "Failed to return cone. Please try again.");
    } finally {
      setSubmittingReturn(false);
    }
  };

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
                        disabled={submittingReturn}
                      >
                        {submittingReturn ? (
                          <>
                            <span className="animate-spin inline-block mr-2">⟳</span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="ri-scales-3-line me-2"></i>
                            Save Weight
                          </>
                        )}
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

