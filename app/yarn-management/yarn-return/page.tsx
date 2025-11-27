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
import yarnConeService from "@/shared/services/yarnConeService";
import storageSlotService from "@/shared/services/storageSlotService";

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
  const [activeConeId, setActiveConeId] = useState<string | null>(null);
  const [historyStatusFilter, setHistoryStatusFilter] =
    useState<ReturnStatus | "all">("all");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyDateRange, setHistoryDateRange] = useState<{
    from: string;
    to: string;
  }>({ from: "", to: "" });
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [showScanReturnPanel, setShowScanReturnPanel] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  const [scannedConeData, setScannedConeData] = useState<Map<string, any>>(new Map());
  const [rackBarcodes, setRackBarcodes] = useState<Map<string, string>>(new Map()); // Map cone barcode to rack barcode
  const [scanningMode, setScanningMode] = useState<"cone" | "rack">("cone"); // Track if scanning cone or rack
  const [currentConeBarcode, setCurrentConeBarcode] = useState<string | null>(null); // Track which cone needs rack
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [storingCone, setStoringCone] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    totalWeight: "",
    numberOfCones: "1",
    totalTearWeight: "0",
    totalNetWeight: "",
  });

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
    setShowScanReturnPanel(true);
    setBarcodeInput("");
    setScannedBarcodes([]);
    setScannedConeData(new Map());
    setRackBarcodes(new Map());
    setScanningMode("cone");
    setCurrentConeBarcode(null);
    setActiveConeId(null);
    setTransactionForm({
      totalWeight: "",
      numberOfCones: "1",
      totalTearWeight: "0",
      totalNetWeight: "",
    });
  };

  const handleStoreConeInRack = async (coneBarcode: string, rackBarcode: string) => {
    console.log("🏪 Storing cone in rack:", {
      coneBarcode,
      rackBarcode,
    });
    
    setStoringCone(true);
    try {
      const token = getAccessToken();
      
      // First, get the cone details to get the cone ID
      console.log("🔍 Fetching cone details for storage:", coneBarcode);
      const coneResponse = await fetch(
        `${API_BASE_URL}/yarn-management/yarn-cones/barcode/${coneBarcode}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      console.log("📡 Cone fetch response status:", coneResponse.status, coneResponse.ok);

      if (!coneResponse.ok) {
        console.error("❌ Failed to fetch cone details:", coneResponse.status);
        throw new Error("Failed to fetch cone details");
      }

      const coneDetails = await coneResponse.json();
      const coneId = coneDetails._id || coneDetails.id;

      console.log("📦 Cone details retrieved:", {
        coneId,
        coneBarcode: coneDetails.barcode,
        coneDetails,
      });

      if (!coneId) {
        console.error("❌ Cone ID not found in response:", coneDetails);
        throw new Error("Cone ID not found");
      }

      // Validate rack barcode by fetching slot details
      console.log("🔍 Validating rack barcode:", rackBarcode);
      const slotDetails = await storageSlotService.getSlotDetailsByBarcode(rackBarcode);
      
      console.log("🏷️ Slot details:", {
        zoneType: slotDetails?.zoneType,
        zoneCode: slotDetails?.storageSlot?.zoneCode,
        slotLabel: slotDetails?.storageSlot?.label,
        slotBarcode: slotDetails?.storageSlot?.barcode,
        hasSlotDetails: !!slotDetails,
      });
      
      // Check if it's a short-term storage rack (zoneType can be "SHORT_TERM" or zoneCode can be "ST")
      const isShortTerm = slotDetails && (
        slotDetails.zoneType === "SHORT_TERM" || 
        slotDetails.zoneType === "ST" ||
        slotDetails.storageSlot?.zoneCode === "ST"
      );
      
      if (!slotDetails || !isShortTerm) {
        console.error("❌ Invalid rack - not ST zone:", {
          zoneType: slotDetails?.zoneType,
          zoneCode: slotDetails?.storageSlot?.zoneCode,
          hasSlotDetails: !!slotDetails,
        });
        throw new Error("Invalid rack barcode. Must be a short-term storage rack.");
      }

      // Update cone with rack storage location
      console.log("💾 Updating cone with storage location:", {
        coneId,
        coneStorageId: rackBarcode,
      });
      
      await yarnConeService.updateYarnCone(coneId, {
        coneStorageId: rackBarcode,
      });

      console.log("✅ Cone updated with storage location");

      // Store rack barcode mapping
      const newRackBarcodes = new Map(rackBarcodes);
      newRackBarcodes.set(coneBarcode, rackBarcode);
      setRackBarcodes(newRackBarcodes);

      console.log("📊 Rack barcodes mapping:", {
        totalScanned: scannedBarcodes.length,
        totalStored: newRackBarcodes.size,
        mapping: Array.from(newRackBarcodes.entries()),
      });

      toast.success(`Cone stored in rack ${rackBarcode}`);
      
      // Check if all cones have been scanned and stored
      const numberOfCones = parseInt(transactionForm.numberOfCones) || 1;
      console.log("🔢 Checking if all cones stored:", {
        scannedCount: scannedBarcodes.length,
        storedCount: newRackBarcodes.size,
        requiredCount: numberOfCones,
        scannedBarcodes: Array.from(scannedBarcodes),
        rackBarcodes: Array.from(newRackBarcodes.entries()),
      });
      
      // Check if we should open the modal
      const allConesScanned = scannedBarcodes.length >= numberOfCones;
      const allConesStored = newRackBarcodes.size >= numberOfCones;
      const shouldOpenModal = allConesScanned && allConesStored;
      
      console.log("📋 Modal check:", {
        allConesScanned,
        allConesStored,
        shouldOpenModal,
      });
      
      if (shouldOpenModal) {
        // All cones scanned and stored, open modal
        console.log("✅ All cones scanned and stored, opening modal");
        setShowReturnModal(true);
        toast.success(`All ${numberOfCones} cone(s) scanned and stored. Fill in the transaction details.`);
      } else {
        // Reset to scan next cone only if not opening modal
        console.log("🔄 Resetting to scan next cone");
        setScanningMode("cone");
        setCurrentConeBarcode(null);
        setBarcodeInput("");
      }
    } catch (error) {
      console.error("❌ Error storing cone in rack:", {
        error,
        coneBarcode,
        rackBarcode,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      toast.error(error instanceof Error ? error.message : "Failed to store cone in rack");
    } finally {
      setStoringCone(false);
    }
  };

  const handleBarcodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrder) {
      toast.error("Select a production order to continue.");
      return;
    }

    const value = barcodeInput.trim();
    if (!value) {
      toast.error(scanningMode === "cone" ? "Scan a cone barcode to continue." : "Scan a rack barcode to continue.");
      return;
    }

    // Handle rack barcode scanning
    if (scanningMode === "rack" && currentConeBarcode) {
      await handleStoreConeInRack(currentConeBarcode, value);
      return;
    }

    // Handle cone barcode scanning
    // Check if barcode is already scanned
    if (scannedBarcodes.includes(value)) {
      toast.error("This barcode has already been scanned.");
      setBarcodeInput("");
      return;
    }

    setBarcodeLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/yarn-management/yarn-cones/barcode/${value}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch cone details");
      }

      const coneDetails = await response.json();
      
      console.log("🔍 Cone Details from API:", {
        barcode: value,
        coneDetails,
        selectedOrderNumber: selectedOrder.orderNumber,
        orderConesCount: selectedOrder.cones.length,
        orderConesBarcodes: selectedOrder.cones.map(c => c.barcode),
      });
      
      // Check if cone is already returned
      if (coneDetails.returnStatus === "returned") {
        console.log("⚠️ Cone already returned:", value);
        toast("This cone has already been marked as returned.", {
          icon: "ℹ️",
        });
        setBarcodeInput("");
        return;
      }

      // Find the cone in the selected order (try multiple matching strategies)
      console.log("🔎 Attempting to find cone in order by barcode:", value);
      let cone = selectedOrder.cones.find(
        (item) => item.barcode.toLowerCase() === value.toLowerCase()
      );

      if (cone) {
        console.log("✅ Cone found in order by barcode:", {
          coneId: cone.id,
          coneBarcode: cone.barcode,
          coneStatus: cone.status,
        });
      } else {
        console.log("❌ Cone not found by barcode, trying _id match...");
        // If not found by barcode, try matching by _id
        if (coneDetails._id) {
          cone = selectedOrder.cones.find(
            (item) => item.id === coneDetails._id || item.id === coneDetails.id
          );
          
          if (cone) {
            console.log("✅ Cone found in order by _id:", {
              coneId: cone.id,
              coneBarcode: cone.barcode,
              searchedId: coneDetails._id,
            });
          } else {
            console.log("❌ Cone not found by _id either");
          }
        }
      }

      // If still not found, create a cone object from the API response
      if (!cone) {
        console.log("📦 Creating cone object from API response:", {
          coneDetailsId: coneDetails._id,
          coneDetailsBarcode: coneDetails.barcode,
          issueWeight: coneDetails.issueWeight,
          returnStatus: coneDetails.returnStatus,
        });
        
        // Create a cone object from the API response
        cone = {
          id: coneDetails._id || coneDetails.id || value,
          barcode: coneDetails.barcode || value,
          yarnCode: coneDetails.yarn?.id || coneDetails.yarn || "N/A",
          yarnName: coneDetails.yarnName || "Unknown Yarn",
          yarnType: coneDetails.yarn?.yarnType?.name || "Unknown",
          issuedWeight: coneDetails.issueWeight || 0,
          returnedWeight: coneDetails.returnWeight,
          balanceWeight: coneDetails.issueWeight && coneDetails.returnWeight 
            ? Math.max(coneDetails.issueWeight - coneDetails.returnWeight, 0)
            : undefined,
          status: coneDetails.returnStatus === "returned" ? "Returned" as ConeStatus : "Awaiting" as ConeStatus,
          lastReturnedAt: coneDetails.returnDate,
          transactionId: coneDetails.transactionId,
          yarnCatalogId: coneDetails.yarn?.id || coneDetails.yarn,
        };
        
        console.log("✅ Created cone object:", {
          id: cone.id,
          barcode: cone.barcode,
          status: cone.status,
          issuedWeight: cone.issuedWeight,
        });
      }

      // Check if cone is already returned (double check)
      if (cone.status === "Returned" || coneDetails.returnStatus === "returned") {
        console.log("⚠️ Cone already returned (double check):", {
          coneStatus: cone.status,
          apiReturnStatus: coneDetails.returnStatus,
        });
        toast("This cone has already been marked as returned.", {
          icon: "ℹ️",
        });
        setBarcodeInput("");
        return;
      }

      // Add to scanned barcodes and store cone data
      const newScannedBarcodes = [...scannedBarcodes, value];
      const newScannedConeData = new Map(scannedConeData);
      newScannedConeData.set(value, { ...coneDetails, cone });
      
      console.log("💾 Storing cone data:", {
        barcode: value,
        scannedBarcodesCount: newScannedBarcodes.length,
        coneId: cone.id,
        coneStatus: cone.status,
      });
      
      setScannedBarcodes(newScannedBarcodes);
      setScannedConeData(newScannedConeData);
      setBarcodeInput("");

      // Switch to rack scanning mode for this cone
      console.log("🔄 Switching to rack scanning mode for cone:", value);
      setScanningMode("rack");
      setCurrentConeBarcode(value);
      toast.success(`Cone scanned. Now scan the rack barcode for this cone.`);
    } catch (error) {
      console.error("Error fetching cone:", error);
      toast.error("Failed to fetch cone details. Please check the barcode.");
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleTransactionFormChange = (field: string, value: string) => {
    setTransactionForm((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Calculate totalNetWeight when totalWeight or totalTearWeight changes
      if (field === "totalWeight" || field === "totalTearWeight") {
        const totalWeight = parseFloat(updated.totalWeight) || 0;
        const totalTearWeight = parseFloat(updated.totalTearWeight) || 0;
        updated.totalNetWeight = (totalWeight - totalTearWeight).toFixed(2);
      }
      
      return updated;
    });
  };

  const handleReturnSubmit = async () => {
    if (!selectedOrder || scannedBarcodes.length === 0) {
      toast.error("Missing required information.");
      return;
    }

    // Validate form
    const totalWeight = parseFloat(transactionForm.totalWeight);
    const numberOfCones = parseInt(transactionForm.numberOfCones);
    const totalTearWeight = parseFloat(transactionForm.totalTearWeight) || 0;
    const totalNetWeight = parseFloat(transactionForm.totalNetWeight) || 0;

    if (Number.isNaN(totalWeight) || totalWeight <= 0) {
      toast.error("Enter a valid total weight.");
      return;
    }

    if (scannedBarcodes.length !== numberOfCones) {
      toast.error(`Number of scanned barcodes (${scannedBarcodes.length}) must match number of cones (${numberOfCones}).`);
      return;
    }

    // Check if all cones have been stored in racks
    const allConesStored = scannedBarcodes.every(barcode => rackBarcodes.has(barcode));
    if (!allConesStored) {
      toast.error("All cones must be stored in racks before submitting return transaction.");
      return;
    }

    // Calculate weight per cone
    const weightPerCone = totalNetWeight / numberOfCones;
    const tearWeightPerCone = totalTearWeight / numberOfCones;
    const totalWeightPerCone = totalWeight / numberOfCones;

    setSubmittingReturn(true);
    try {
      const token = getAccessToken();
      const transactionDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      // Create a transaction for each scanned barcode
      const transactionPromises = scannedBarcodes.map(async (barcode) => {
        const coneDataFromMap = scannedConeData.get(barcode);
        const cone = coneDataFromMap?.cone;
        
        if (!cone) {
          throw new Error(`Cone data not found for barcode: ${barcode}`);
        }

        // Get yarn ID from cone data - it should be a MongoDB ObjectId
        // Strategy 1: Try to get from coneDataFromMap (API response)
        let yarnId: string | null = null;
        
        if (coneDataFromMap) {
          if (typeof coneDataFromMap.yarn === "string") {
            yarnId = coneDataFromMap.yarn;
          } else if (coneDataFromMap.yarn && typeof coneDataFromMap.yarn === "object") {
            yarnId = coneDataFromMap.yarn._id || coneDataFromMap.yarn.id || null;
          }
        }
        
        // Strategy 2: Try from cone object's yarnCatalogId or yarnCode
        if (!yarnId || yarnId === "N/A") {
          yarnId = cone.yarnCatalogId || (cone.yarnCode !== "N/A" ? cone.yarnCode : null);
        }
        
        // Strategy 3: Try to find the cone in the order's cones (which have yarnCatalogId from issued transactions)
        if ((!yarnId || yarnId === "N/A") && selectedOrder) {
          const orderCone = selectedOrder.cones.find(
            (c) => c.barcode.toLowerCase() === barcode.toLowerCase() || c.id === cone.id
          );
          if (orderCone && orderCone.yarnCatalogId && orderCone.yarnCatalogId !== "N/A") {
            yarnId = orderCone.yarnCatalogId;
            console.log("✅ Got yarn ID from order's cone:", yarnId);
          }
        }
        
        // Strategy 4: Fetch from issued transaction if we have transactionId
        if ((!yarnId || yarnId === "N/A") && cone.transactionId) {
          console.log("🔍 Fetching yarn ID from issued transaction:", cone.transactionId);
          try {
            const txResponse = await fetch(
              `${API_BASE_URL}/yarn-management/yarn-transactions/${cone.transactionId}`,
              {
                headers: {
                  "Content-Type": "application/json",
                  ...(token && { Authorization: `Bearer ${token}` }),
                },
              }
            );
            
            if (txResponse.ok) {
              const txData = await txResponse.json();
              if (typeof txData.yarn === "string") {
                yarnId = txData.yarn;
              } else if (txData.yarn && typeof txData.yarn === "object") {
                yarnId = txData.yarn._id || txData.yarn.id || null;
              }
              console.log("✅ Got yarn ID from transaction:", yarnId);
            } else {
              console.warn("⚠️ Transaction fetch failed:", txResponse.status);
            }
          } catch (txError) {
            console.error("❌ Failed to fetch transaction:", txError);
          }
        }
        
        // Strategy 5: Query issued transactions for this order and find matching by yarnName or coneBarcode
        if ((!yarnId || yarnId === "N/A") && selectedOrder && cone.yarnName) {
          console.log("🔍 Querying issued transactions for order:", selectedOrder.orderNumber);
          try {
            const txListResponse = await fetch(
              `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-issued-by-order/${selectedOrder.orderNumber}`,
              {
                headers: {
                  "Content-Type": "application/json",
                  ...(token && { Authorization: `Bearer ${token}` }),
                },
              }
            );
            
            if (txListResponse.ok) {
              const txListData = await txListResponse.json();
              const issuedTransactions = Array.isArray(txListData) ? txListData : (txListData.results || []);
              
              console.log("📋 Found issued transactions:", issuedTransactions.length);
              
              // Try to find transaction matching by coneBarcode first
              let matchingTx = issuedTransactions.find((tx: any) => 
                tx.coneBarcode === barcode || tx.coneBarcode?.toLowerCase() === barcode.toLowerCase()
              );
              
              // If no match by barcode, try matching by yarnName
              if (!matchingTx && cone.yarnName) {
                matchingTx = issuedTransactions.find((tx: any) => 
                  tx.yarnName === cone.yarnName || 
                  tx.yarnName?.toLowerCase() === cone.yarnName.toLowerCase()
                );
                console.log("🔍 Matching by yarnName:", cone.yarnName, matchingTx ? "Found" : "Not found");
              }
              
              // If still no match and there's only one transaction, use it
              if (!matchingTx && issuedTransactions.length === 1) {
                matchingTx = issuedTransactions[0];
                console.log("🔍 Using single transaction as fallback");
              }
              
              if (matchingTx) {
                if (typeof matchingTx.yarn === "string") {
                  yarnId = matchingTx.yarn;
                } else if (matchingTx.yarn && typeof matchingTx.yarn === "object") {
                  yarnId = matchingTx.yarn._id || matchingTx.yarn.id || null;
                }
                console.log("✅ Got yarn ID from matching transaction:", {
                  yarnId,
                  transactionId: matchingTx._id,
                  yarnName: matchingTx.yarnName,
                });
              } else {
                console.warn("⚠️ No matching transaction found:", {
                  searchedBarcode: barcode,
                  searchedYarnName: cone.yarnName,
                  availableTransactions: issuedTransactions.map((tx: any) => ({
                    id: tx._id,
                    yarnName: tx.yarnName,
                    coneBarcode: tx.coneBarcode,
                  })),
                });
              }
            }
          } catch (txListError) {
            console.error("❌ Failed to query transactions:", txListError);
          }
        }
        
        if (!yarnId || yarnId === "N/A") {
          console.error("❌ Invalid yarn ID after all attempts:", {
            yarnId,
            coneDataYarn: coneDataFromMap?.yarn,
            coneYarnCatalogId: cone.yarnCatalogId,
            coneYarnCode: cone.yarnCode,
            transactionId: cone.transactionId,
          });
          throw new Error(`Invalid yarn ID for cone ${barcode}. Cannot create return transaction. Please ensure the cone was properly issued.`);
        }

        console.log("📦 Using yarn ID for transaction:", {
          yarnId,
          yarnName: cone.yarnName,
          barcode,
        });

        const transactionData = {
          yarn: yarnId, // Must be a valid MongoDB ObjectId
          yarnName: cone.yarnName,
          transactionType: "yarn_returned",
          transactionDate: transactionDate,
          totalWeight: totalWeightPerCone,
          totalTearWeight: tearWeightPerCone,
          totalNetWeight: weightPerCone,
          numberOfCones: 1,
          orderno: selectedOrder.orderNumber,
          issuedTransactionId: cone.transactionId, // Link to original issue transaction
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
          throw new Error(errorData.message || `Failed to create return transaction for ${barcode}`);
        }

        // Update cone return status after successful transaction
        const coneId = coneDataFromMap?._id || coneDataFromMap?.id;
        
        if (!coneId) {
          throw new Error(`Cone ID not found for barcode: ${barcode}`);
        }

        // Update cone return status via separate API call
        const updateConeResponse = await fetch(`${API_BASE_URL}/yarn-management/yarn-cones/${coneId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            returnStatus: "returned",
            returnWeight: weightPerCone,
          }),
        });

        if (!updateConeResponse.ok) {
          const errorData = await updateConeResponse.json().catch(() => ({}));
          console.error(`Failed to update cone return status for ${barcode}:`, errorData);
          // Continue even if status update fails, but log the error
        }

        return { barcode, cone, coneId };
      });

      // Wait for all transactions to complete
      const results = await Promise.all(transactionPromises);

      // Update local state for all returned cones
      const updatedOrders = orders.map((order) => {
        if (order.id !== selectedOrder.id) {
          return order;
        }

        const updatedCones = order.cones.map((cone) => {
          // Check if this cone was returned
          const returnedResult = results.find((r) => r.cone.id === cone.id);
          if (returnedResult) {
            return {
              ...cone,
              returnedWeight: weightPerCone,
              balanceWeight: Math.max(cone.issuedWeight - weightPerCone, 0),
              status: "Returned" as ConeStatus,
              lastReturnedAt: new Date().toISOString(),
            };
          }
          return cone;
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

        toast.success(`${results.length} cone(s) marked returned successfully.`);

        // Close modal and reset
        setShowReturnModal(false);
        setBarcodeInput("");
        setScannedBarcodes([]);
        setScannedConeData(new Map());
        setRackBarcodes(new Map());
        setScanningMode("cone");
        setCurrentConeBarcode(null);
        setActiveConeId(null);
        setTransactionForm({
          totalWeight: "",
          numberOfCones: "1",
          totalTearWeight: "0",
          totalNetWeight: "",
        });

        if (updatedOrder.status === "Returned") {
          toast.success(
            `All cones returned for ${updatedOrder.productionOrder}. Production order is now cleared.`
          );
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
            </div>
          </div>

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

      {/* Scan & Return Side Panel */}
      {showScanReturnPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => {
              setShowScanReturnPanel(false);
              setScannedBarcodes([]);
              setScannedConeData(new Map());
              setRackBarcodes(new Map());
              setScanningMode("cone");
              setCurrentConeBarcode(null);
            }}
          />
          {/* Side Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <div className="box h-full flex flex-col">
              <div className="box-header border-b border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="box-title text-lg">Scan &amp; Return</h3>
                    {selectedOrder && (
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedOrder.productionOrder}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowScanReturnPanel(false);
                      setBarcodeInput("");
                      setScannedBarcodes([]);
                      setScannedConeData(new Map());
                      setRackBarcodes(new Map());
                      setScanningMode("cone");
                      setCurrentConeBarcode(null);
                      setActiveConeId(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close panel"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <div className="box-body flex-1 overflow-y-auto">
                {!selectedOrder ? (
                  <div className="text-center py-12 text-sm text-gray-500">
                    <i className="ri-focus-2-line text-4xl text-gray-300 mb-2"></i>
                    <p>Select an order to start returning cones.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border border-dashed border-primary/40 rounded-md p-4 bg-primary/5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {selectedOrder.productionOrder}
                          </p>
                          <p className="text-xs text-gray-500">
                            Floor: {selectedOrder.floor}
                          </p>
                          <p className="text-xs text-gray-500">
                            Cones: {selectedOrder.cones.filter(c => c.status !== "Returned").length} pending
                          </p>
                        </div>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeColor(
                            selectedOrder.status
                          )}`}
                        >
                          {selectedOrder.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Number of Cones Input */}
                      <div>
                        <label className="form-label text-sm font-semibold text-gray-700">
                          Number of Cones to Return
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="form-control"
                          placeholder="Enter number of cones"
                          value={transactionForm.numberOfCones}
                          onChange={(e) => {
                            const numCones = e.target.value;
                            setTransactionForm((prev) => ({
                              ...prev,
                              numberOfCones: numCones,
                            }));
                            // Reset scanned barcodes if number changes
                            if (scannedBarcodes.length > 0) {
                              setScannedBarcodes([]);
                              setScannedConeData(new Map());
                            }
                          }}
                          disabled={scannedBarcodes.length > 0}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {scannedBarcodes.length > 0 
                            ? "Cannot change number of cones after scanning has started. Clear scanned barcodes first."
                            : "Enter how many cones you want to return in this transaction."}
                        </p>
                      </div>

                      {/* Scanning Progress */}
                      {parseInt(transactionForm.numberOfCones) > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-900">
                              Scanning Progress
                            </span>
                            <span className="text-sm text-blue-700">
                              {scannedBarcodes.length} / {transactionForm.numberOfCones}
                            </span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${(scannedBarcodes.length / parseInt(transactionForm.numberOfCones || "1")) * 100}%`,
                              }}
                            ></div>
                          </div>
                          {scannedBarcodes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-blue-900">Scanned Cones & Racks:</p>
                              <div className="flex flex-wrap gap-1">
                                {scannedBarcodes.map((barcode, index) => {
                                  const rackBarcode = rackBarcodes.get(barcode);
                                  return (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      Cone: {barcode}
                                      {rackBarcode && <span className="ml-1 text-green-700">→ Rack: {rackBarcode}</span>}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newBarcodes = scannedBarcodes.filter((_, i) => i !== index);
                                          const newConeData = new Map(scannedConeData);
                                          const newRackBarcodes = new Map(rackBarcodes);
                                          newConeData.delete(barcode);
                                          newRackBarcodes.delete(barcode);
                                          setScannedBarcodes(newBarcodes);
                                          setScannedConeData(newConeData);
                                          setRackBarcodes(newRackBarcodes);
                                          if (currentConeBarcode === barcode) {
                                            setCurrentConeBarcode(null);
                                            setScanningMode("cone");
                                          }
                                        }}
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                      >
                                        <i className="ri-close-line text-xs"></i>
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Barcode Scanning Form */}
                      <form onSubmit={handleBarcodeSubmit} className="space-y-2">
                        <label className="form-label text-sm font-semibold text-gray-700">
                          {scanningMode === "cone" ? "Scan Cone Barcode" : "Scan Rack Barcode (Short-Term Storage)"}
                        </label>
                        {scanningMode === "rack" && currentConeBarcode && (
                          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                            <i className="ri-information-line me-1"></i>
                            Scanning rack for cone: <strong>{currentConeBarcode}</strong>
                          </div>
                        )}
                        <div className="relative">
                          <input
                            type="text"
                            className="form-control ps-10"
                            placeholder={scanningMode === "cone" ? "Scan or enter cone barcode" : "Scan or enter rack barcode"}
                            value={barcodeInput}
                            onChange={(event) => setBarcodeInput(event.target.value)}
                            disabled={barcodeLoading || storingCone || (scanningMode === "cone" && scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1"))}
                            autoFocus
                          />
                          <i className="ri-barcode-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        </div>
                        <button
                          type="submit"
                          className="ti-btn ti-btn-primary w-full whitespace-normal break-words leading-tight px-4 py-2 text-sm"
                          disabled={barcodeLoading || storingCone || (scanningMode === "cone" && (scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1") || !transactionForm.numberOfCones || parseInt(transactionForm.numberOfCones) < 1))}
                        >
                          {barcodeLoading ? (
                            <>
                              <span className="animate-spin inline-block mr-2">⟳</span>
                              Loading...
                            </>
                          ) : storingCone ? (
                            <>
                              <span className="animate-spin inline-block mr-2">⟳</span>
                              Storing Cone...
                            </>
                          ) : scanningMode === "rack" ? (
                            "Scan Rack Barcode"
                          ) : scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1") ? (
                            "All Barcodes Scanned"
                          ) : (
                            "Scan Cone Barcode"
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="box-header border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <h3 className="box-title text-lg">Return Yarn</h3>
                <button
                  onClick={() => {
                    setShowReturnModal(false);
                    setScannedBarcodes([]);
                    setScannedConeData(new Map());
                    setRackBarcodes(new Map());
                    setScanningMode("cone");
                    setCurrentConeBarcode(null);
                    setActiveConeId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="box-body p-6">
              {scannedBarcodes.length > 0 && selectedOrder && (
                <>
                  <div className="mb-6 p-4 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Scanned Barcodes ({scannedBarcodes.length})
                    </h4>
                    <div className="space-y-2">
                      {scannedBarcodes.map((barcode, index) => {
                        const coneData = scannedConeData.get(barcode);
                        const cone = coneData?.cone;
                        const rackBarcode = rackBarcodes.get(barcode);
                        return (
                          <div key={index} className="border border-gray-200 rounded p-3 bg-white">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Barcode:</span>
                                <span className="ml-2 font-medium">{barcode}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Yarn Name:</span>
                                <span className="ml-2 font-medium">
                                  {cone?.yarnName || coneData?.yarnName || "N/A"}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Issued Weight:</span>
                                <span className="ml-2 font-medium">
                                  {cone?.issuedWeight?.toFixed(2) || "N/A"} kg
                                </span>
                              </div>
                              {rackBarcode && (
                                <div>
                                  <span className="text-gray-500">Storage Rack:</span>
                                  <span className="ml-2 font-medium text-green-700">{rackBarcode}</span>
                                </div>
                              )}
                              {coneData?.coneWeight && (
                                <div>
                                  <span className="text-gray-500">Cone Weight:</span>
                                  <span className="ml-2 font-medium">{coneData.coneWeight} kg</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="form-label text-sm font-semibold text-gray-700">
                        Total Weight (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        placeholder="Enter total weight"
                        value={transactionForm.totalWeight}
                        onChange={(e) => handleTransactionFormChange("totalWeight", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="form-label text-sm font-semibold text-gray-700">
                        Number of Cones <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="form-control"
                        placeholder="Enter number of cones"
                        value={transactionForm.numberOfCones}
                        onChange={(e) => handleTransactionFormChange("numberOfCones", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="form-label text-sm font-semibold text-gray-700">
                        Total Tear Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        placeholder="Enter tear weight"
                        value={transactionForm.totalTearWeight}
                        onChange={(e) => handleTransactionFormChange("totalTearWeight", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="form-label text-sm font-semibold text-gray-700">
                        Total Net Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control bg-gray-50"
                        placeholder="Auto-calculated"
                        value={transactionForm.totalNetWeight}
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Calculated as: Total Weight - Total Tear Weight
                      </p>
                    </div>

                    {selectedOrder && (
                      <div className="p-3 bg-blue-50 rounded-md">
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">Order:</span> {selectedOrder.orderNumber}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-semibold">Number of Cones:</span> {scannedBarcodes.length}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-semibold">Total Net Weight:</span>{" "}
                          {transactionForm.totalNetWeight || "0"} kg
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReturnModal(false);
                        setScannedBarcodes([]);
                        setScannedConeData(new Map());
                        setRackBarcodes(new Map());
                        setScanningMode("cone");
                        setCurrentConeBarcode(null);
                        setActiveConeId(null);
                      }}
                      className="ti-btn ti-btn-outline"
                      disabled={submittingReturn}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleReturnSubmit}
                      className="ti-btn ti-btn-primary"
                      disabled={submittingReturn}
                    >
                      {submittingReturn ? (
                        <>
                          <span className="animate-spin inline-block mr-2">⟳</span>
                          Processing...
                        </>
                      ) : (
                        "Return Yarn"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YarnReturnPage;

