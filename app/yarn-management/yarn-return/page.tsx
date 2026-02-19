"use client";
import React, {
  FormEvent,
  useCallback,
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
import {
  getCompletedItemsAssignments,
  updateAssignmentItemYarnReturnStatus,
  type MachineOrderAssignmentTopItems,
  type PopulatedOrderRef,
  type PopulatedArticleRef,
} from "@/shared/services/machineOrderAssignmentService";
import AssignmentsCards from "@/app/catalog/needle-configuration/components/AssignmentsCards";

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

interface ReturnTransaction {
  _id: string;
  orderno: string;
  yarnName: string;
  transactionType: string;
  transactionDate: string;
  transactionNetWeight: number;
  transactionTotalWeight: number;
  transactionTearWeight: number;
  transactionConeCount: number;
  createdAt: string;
  updatedAt: string;
  yarn?: {
    _id: string;
    yarnName: string;
    yarnType?: {
      name: string;
    };
  };
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

/** Machine label for display (code or name). Same as yarn-issue. */
function machineLabel(a: MachineOrderAssignmentTopItems): string {
  const m = a.machine;
  if (typeof m === "object" && m) {
    return (m as { machineCode?: string; name?: string; id?: string }).machineCode ?? (m as { name?: string }).name ?? (m as { id?: string }).id ?? "—";
  }
  return typeof m === "string" ? m : "—";
}

// Helper function to extract transactions from nested API response structure
const extractTransactions = (data: any): any[] => {
  if (!data) return [];
  
  // Handle paginated response
  if (data.results) {
    data = data.results;
  }
  
  // If not an array, return empty
  if (!Array.isArray(data)) {
    return [];
  }
  
  // Extract transactions from nested structure
  const transactions: any[] = [];
  data.forEach((item: any) => {
    // Check if item has a transactions array (nested structure)
    if (item.transactions && Array.isArray(item.transactions)) {
      transactions.push(...item.transactions);
    } else if (item.transactionType) {
      // If item is already a transaction, add it directly
      transactions.push(item);
    }
  });
  
  return transactions;
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
  const [returnTransactions, setReturnTransactions] = useState<ReturnTransaction[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeConeId, setActiveConeId] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyDateRange, setHistoryDateRange] = useState<{
    from: string;
    to: string;
  }>({ from: "", to: "" });
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [machineAssignments, setMachineAssignments] = useState<MachineOrderAssignmentTopItems[]>([]);
  const [machineAssignmentsLoading, setMachineAssignmentsLoading] = useState(true);
  const [selectedMachineAssignmentId, setSelectedMachineAssignmentId] = useState<string | null>(null);
  const [selectedMachineAssignment, setSelectedMachineAssignment] = useState<MachineOrderAssignmentTopItems | null>(null);
  const [machineSearchTerm, setMachineSearchTerm] = useState("");
  const [orderSelectOpen, setOrderSelectOpen] = useState(true);
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
  const [emptyCones, setEmptyCones] = useState<Set<string>>(new Set()); // Track which cones are empty (no yarn left)
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showConeTypeModal, setShowConeTypeModal] = useState(false);
  const [pendingConeBarcode, setPendingConeBarcode] = useState<string | null>(null);
  const [pendingConeData, setPendingConeData] = useState<any>(null);
  const [transactionForm, setTransactionForm] = useState({
    totalWeight: "",
    numberOfCones: "1",
    totalTearWeight: "0",
    totalNetWeight: "",
  });

  const pendingToastShown = useRef(false);
  const hasPermission = hasSubPermission("/yarn-management", "Yarn Return");

  /** Fetch cones + return tx for one order. Used when loading orders from completed-items. */
  const fetchOrderWithCones = useCallback(
    async (
      token: string | null,
      orderNumber: string,
      orderId: string,
      meta: { floor: string; articles: Article[]; createdAt?: string; updatedAt?: string }
    ): Promise<ProductionOrder> => {
      let issuedTransactions: any[] = [];
      let returnedTransactions: any[] = [];
      try {
        const [issuedRes, allRes] = await Promise.all([
          fetch(
            `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-issued-by-order/${orderNumber}`,
            { headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) } }
          ),
          fetch(
            `${API_BASE_URL}/yarn-management/yarn-transactions?orderno=${orderNumber}`,
            { headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) } }
          ),
        ]);
        if (issuedRes.ok) {
          const d = await issuedRes.json();
          issuedTransactions = extractTransactions(d).filter((tx: any) => tx.transactionType === "yarn_issued");
        }
        if (allRes.ok) {
          const d = await allRes.json();
          returnedTransactions = extractTransactions(d).filter((tx: any) => tx.transactionType === "yarn_returned");
        }
      } catch (err) {
        console.warn("Fetch transactions for order", orderNumber, err);
      }

      const conesMap = new Map<string, Cone>();
      issuedTransactions.forEach((tx: any) => {
        if (tx.transactionType !== "yarn_issued") return;
        const coneBarcode = tx.coneBarcode || tx.barcode || `TX-${tx._id || tx.id}`;
        const coneId = coneBarcode;
        const returnedTx = returnedTransactions.find(
          (rt: any) =>
            (tx.coneBarcode && rt.coneBarcode ? rt.coneBarcode === tx.coneBarcode : rt.issuedTransactionId === (tx._id || tx.id)) &&
            rt.transactionType === "yarn_returned"
        );
        const numberOfCones = tx.numberOfCones || tx.transactionConeCount || 1;
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
            balanceWeight: returnedTx ? Math.max(weightPerCone - ((returnedTx.transactionNetWeight || returnedTx.totalNetWeight || 0) / numberOfCones), 0) : undefined,
            status: returnedTx ? ("Returned" as ConeStatus) : ("Awaiting" as ConeStatus),
            lastReturnedAt: returnedTx?.transactionDate || returnedTx?.createdAt,
            transactionId: tx._id || tx.id,
            yarnCatalogId: tx.yarn?.id || tx.yarn,
          });
        }
      });
      const cones = Array.from(conesMap.values());
      const lastUpdated = meta.updatedAt || meta.createdAt || new Date().toISOString();
      return {
        id: orderId,
        productionOrder: orderNumber,
        orderNumber,
        floor: meta.floor,
        knittingSupervisor: "N/A",
        knittingCompletedAt: meta.createdAt || lastUpdated,
        status: getOrderStatusFromCones(cones),
        cones,
        lastUpdated,
        articles: meta.articles,
        hasIssuedTransactions: issuedTransactions.length > 0,
      };
    },
    []
  );

  // Fetch completed-items (machines with completed PO items) – same pattern as yarn-issue top-items
  useEffect(() => {
    const fetchCompleted = async () => {
      if (!hasPermission) return;
      setMachineAssignmentsLoading(true);
      try {
        const list = await getCompletedItemsAssignments();
        setMachineAssignments(list);
        // Empty list: no machine to select → never call loadOrdersForMachine, so clear orders loading
        if (list.length === 0) setOrdersLoading(false);
      } catch (error) {
        console.error("Error fetching completed-items:", error);
        toast.error("Failed to load machines (completed items)");
        setMachineAssignments([]);
        setOrdersLoading(false);
      } finally {
        setMachineAssignmentsLoading(false);
      }
    };
    fetchCompleted();
  }, [hasPermission]);

  /** Build orders from assignment and fetch cones for each (like yarn-issue loadOrdersForMachine). */
  const loadOrdersForMachine = useCallback(
    async (assignment: MachineOrderAssignmentTopItems) => {
      const items = assignment.productionOrderItems ?? [];
      if (items.length === 0) {
        setOrders([]);
        setHistory([]);
        setReturnTransactions((prev) => prev);
        setSelectedOrderId(null);
        setSelectedMachineAssignmentId(assignment.id);
        setSelectedMachineAssignment(assignment);
        setOrdersLoading(false);
        return;
      }
      setSelectedMachineAssignmentId(assignment.id);
      setSelectedMachineAssignment(assignment);

      const orderMap = new Map<
        string,
        { order: PopulatedOrderRef | null; articles: { article: PopulatedArticleRef; item: (typeof items)[0] }[] }
      >();
      for (const item of items) {
        const po = item.productionOrder;
        const art = item.article;
        const orderId = typeof po === "string" ? po : (po?.id ?? po?._id ?? "");
        const orderObj = typeof po === "object" ? po : null;
        const articleObj = typeof art === "object" ? art : null;
        if (!orderId || !articleObj) continue;
        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, { order: orderObj ?? null, articles: [] });
        }
        orderMap.get(orderId)!.articles.push({ article: articleObj, item });
      }

      const builtOrdersMeta: { orderId: string; orderNumber: string; floor: string; articles: Article[]; createdAt?: string; updatedAt?: string }[] = [];
      orderMap.forEach((value, orderId) => {
        const { order, articles } = value;
        const firstItem = articles[0]?.item;
        const orderNumber = order?.orderNumber ?? firstItem?.orderNumber ?? "";
        builtOrdersMeta.push({
          orderId,
          orderNumber,
          floor: order?.currentFloor ?? "N/A",
          articles: articles.map(({ article, item: it }) => ({
            id: article?.id ?? article?._id ?? "",
            _id: article?._id,
            articleNumber: article?.articleNumber ?? it?.articleNumber ?? "",
            plannedQuantity: article?.plannedQuantity ?? 0,
            linkingType: (article?.linkingType as string) ?? "Auto Linking",
            priority: (article?.priority as string) ?? "Medium",
            status: (article?.status as string) ?? "Pending",
            machineId: undefined,
            remarks: article?.remarks as string | undefined,
          })),
          createdAt: order?.createdAt as string | undefined,
          updatedAt: order?.updatedAt as string | undefined,
        });
      });

      setOrdersLoading(true);
      const token = getAccessToken();
      try {
        const ordersWithCones = await Promise.all(
          builtOrdersMeta.map((meta) =>
            fetchOrderWithCones(token, meta.orderNumber, meta.orderId, {
              floor: meta.floor,
              articles: meta.articles,
              createdAt: meta.createdAt,
              updatedAt: meta.updatedAt,
            })
          )
        );
        const filtered = ordersWithCones.filter((o) => o.hasIssuedTransactions || o.cones.length > 0);
        setOrders(filtered);
        setHistory(filtered.map((order) => buildHistoryRecord(order)));

        const allReturnTxs: ReturnTransaction[] = [];
        await Promise.all(
          filtered.map(async (o) => {
            try {
              const res = await fetch(
                `${API_BASE_URL}/yarn-management/yarn-transactions?orderno=${o.orderNumber}`,
                { headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) } }
              );
              if (!res.ok) return;
              const data = await res.json();
              const txs = extractTransactions(data).filter((tx: any) => tx.transactionType === "yarn_returned") as ReturnTransaction[];
              allReturnTxs.push(...txs);
            } catch (err) {
              console.warn("Fetch return tx for", o.orderNumber, err);
            }
          })
        );
        setReturnTransactions(allReturnTxs);

        const first = filtered[0];
        if (first?.id) {
          setSelectedOrderId(first.id);
        } else {
          setSelectedOrderId(null);
        }
      } catch (error) {
        console.error("Error loading orders for machine:", error);
        toast.error("Failed to load orders and cones");
        setOrders([]);
        setHistory([]);
      } finally {
        setOrdersLoading(false);
      }
    },
    [fetchOrderWithCones]
  );

  // Default: select first machine when completed-items have loaded
  useEffect(() => {
    if (!machineAssignmentsLoading && machineAssignments.length > 0 && selectedMachineAssignmentId === null) {
      loadOrdersForMachine(machineAssignments[0]);
    }
  }, [machineAssignmentsLoading, machineAssignments, selectedMachineAssignmentId, loadOrdersForMachine]);

  // Filter pending orders - exclude orders where all cones have been returned
  // Check both cone status and return transaction cone counts
  const pendingOrders = useMemo(() => {
    return orders.filter((order) => {
      // If order status is already "Returned", exclude it
      if (order.status === "Returned") {
        return false;
      }

      // Check if all cones are marked as returned (most reliable check)
      const allConesReturned =
        order.cones.length > 0 &&
        order.cones.every((cone) => cone.status === "Returned");

      if (allConesReturned) {
        return false; // Exclude from pending
      }

      // Get return transactions for this order (same order number)
      const orderReturnTransactions = returnTransactions.filter(
        (tx) => tx.orderno === order.orderNumber
      );

      if (orderReturnTransactions.length === 0) {
        // No return transactions, show in pending
        return true;
      }

      // Count total cones in the order
      const totalConesInOrder = order.cones.length;

      // Count total cones returned from return transactions
      const totalConesReturned = orderReturnTransactions.reduce(
        (sum, tx) => sum + (tx.transactionConeCount || 1),
        0
      );

      // If returned cones count >= total cones, exclude from pending
      if (totalConesReturned >= totalConesInOrder) {
        return false;
      }

      // If we have some returned cones but not all, still show in pending
      return true;
    });
  }, [orders, returnTransactions]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  // Calculate pending cones (cones that haven't been returned)
  // Count based on return transactions history, not just cone status
  const totalPendingCones = useMemo(
    () =>
      pendingOrders.reduce((sum, order) => {
        // Get return transactions for this order
        const orderReturnTransactions = returnTransactions.filter(
          (tx) => tx.orderno === order.orderNumber
        );
        
        // Count total cones returned from return transactions (from history)
        const totalConesReturnedFromHistory = orderReturnTransactions.reduce(
          (txSum, tx) => txSum + (tx.transactionConeCount || 1),
          0
        );
        
        // Total cones in the order
        const totalConesInOrder = order.cones.length;
        
        // Actual pending cones = total cones - cones returned in history
        const actualPendingCones = Math.max(0, totalConesInOrder - totalConesReturnedFromHistory);
        
        return sum + actualPendingCones;
      }, 0),
    [pendingOrders, returnTransactions]
  );

  // Calculate returned cones from return transactions
  const totalReturnedCones = useMemo(
    () =>
      returnTransactions.reduce(
        (sum, tx) => sum + (tx.transactionConeCount || 1),
        0
      ),
    [returnTransactions]
  );

  // Calculate orders where all cones have been returned
  const totalCompletedOrders = useMemo(() => {
    return orders.filter((order) => {
      // Check if order status is "Returned"
      if (order.status === "Returned") {
        return true;
      }

      // Check if all cones are marked as returned
      const allConesReturned =
        order.cones.length > 0 &&
        order.cones.every((cone) => cone.status === "Returned");

      if (allConesReturned) {
        return true;
      }

      // Get return transactions for this order
      const orderReturnTransactions = returnTransactions.filter(
        (tx) => tx.orderno === order.orderNumber
      );

      if (orderReturnTransactions.length === 0) {
        return false;
      }

      // Count total cones in the order
      const totalConesInOrder = order.cones.length;

      // Count total cones returned from return transactions
      const totalConesReturned = orderReturnTransactions.reduce(
        (sum, tx) => sum + (tx.transactionConeCount || 1),
        0
      );

      // Order is completed if returned cones >= total cones
      return totalConesReturned >= totalConesInOrder;
    }).length;
  }, [orders, returnTransactions]);

  useEffect(() => {
    if (!pendingToastShown.current && pendingOrders.length > 0) {
      pendingToastShown.current = true;
      toast("Knitting completed orders are awaiting cone return.", {
        icon: "🧵",
      });
    }
  }, [pendingOrders]);

  const filteredOrders = useMemo(() => orders, [orders]);

  const filteredReturnTransactions = useMemo(() => {
    return returnTransactions
      .filter((transaction) => {
        // Filter by order number search
        if (
          historySearchTerm &&
          !transaction.orderno
            .toLowerCase()
            .includes(historySearchTerm.toLowerCase()) &&
          !transaction.yarnName
            .toLowerCase()
            .includes(historySearchTerm.toLowerCase())
        ) {
          return false;
        }
        
        // Filter by date range
        if (historyDateRange.from) {
          const fromDate = new Date(historyDateRange.from);
          const transactionDate = new Date(transaction.transactionDate);
          if (transactionDate < fromDate) {
            return false;
          }
        }
        if (historyDateRange.to) {
          const toDate = new Date(historyDateRange.to);
          const transactionDate = new Date(transaction.transactionDate);
          transactionDate.setHours(0, 0, 0, 0);
          if (transactionDate > toDate) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.transactionDate || b.createdAt).getTime() -
          new Date(a.transactionDate || a.createdAt).getTime()
      );
  }, [returnTransactions, historyDateRange.from, historyDateRange.to, historySearchTerm]);

  /** Get assignment item ids and article numbers for an order (for yarn-return-status API). Must be before any early return (hooks order). */
  const getAssignmentItemsForOrder = useCallback(
    (orderId: string): { itemId: string; articleNumber: string }[] => {
      const assignment = selectedMachineAssignment;
      if (!assignment?.id || !assignment.productionOrderItems?.length) return [];
      return assignment.productionOrderItems
        .filter((item) => {
          const po = item.productionOrder;
          const oid = typeof po === "string" ? po : (po?.id ?? (po as { _id?: string })?._id ?? "");
          return oid === orderId;
        })
        .map((item) => ({
          itemId: item.itemId ?? (item as { id?: string }).id ?? "",
          articleNumber: item.articleNumber ?? (typeof item.article === "object" && item.article
            ? (item.article as { articleNumber?: string }).articleNumber ?? ""
            : ""),
        }))
        .filter((x) => x.itemId);
    },
    [selectedMachineAssignment]
  );

  const isInitialLoad = machineAssignmentsLoading || (ordersLoading && orders.length === 0);
  if (isLoading || isInitialLoad) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-gray-400 mb-4">
              <i className="ri-lock-line text-5xl"></i>
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">Access Restricted</h3>
            <p className="text-[11px] text-gray-500 mb-4">You don&apos;t have permission to access Yarn Return.</p>
            <Link href="/yarn-management" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
              <i className="ri-arrow-left-line"></i> Back to Yarn Management
            </Link>
          </div>
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
    setEmptyCones(new Set());
    setShowConeTypeModal(false);
    setPendingConeBarcode(null);
    setPendingConeData(null);
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

      // Update stored cone data with latest coneWeight from API response
      const updatedConeData = new Map(scannedConeData);
      const existingConeData = updatedConeData.get(coneBarcode);
      if (existingConeData) {
        // Get the latest coneWeight from the API response (remaining yarn weight)
        const latestConeWeight = coneDetails.coneWeight || 0;
        updatedConeData.set(coneBarcode, {
          ...existingConeData,
          coneDetails: {
            ...existingConeData.coneDetails,
            ...coneDetails, // Update with latest API response including coneWeight
          },
          coneWeight: latestConeWeight, // Update top-level coneWeight with latest value
        });
        setScannedConeData(updatedConeData);
        console.log("📦 Updated cone data with latest coneWeight:", {
          barcode: coneBarcode,
          coneWeight: latestConeWeight,
          coneDetailsConeWeight: coneDetails.coneWeight,
        });
      }

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
      
      // Check if all cones have been scanned and stored (or are empty)
      const numberOfCones = parseInt(transactionForm.numberOfCones) || 1;
      const conesNeedingRack = scannedBarcodes.filter(b => !emptyCones.has(b));
      const allConesScanned = scannedBarcodes.length >= numberOfCones;
      const allConesStored = newRackBarcodes.size >= conesNeedingRack.length;
      const shouldOpenModal = allConesScanned && allConesStored;
      
      console.log("🔢 Checking if all cones processed:", {
        scannedCount: scannedBarcodes.length,
        storedCount: newRackBarcodes.size,
        requiredCount: numberOfCones,
        emptyConesCount: emptyCones.size,
        conesNeedingRackCount: conesNeedingRack.length,
        scannedBarcodes: Array.from(scannedBarcodes),
        rackBarcodes: Array.from(newRackBarcodes.entries()),
        emptyCones: Array.from(emptyCones),
      });
      
      console.log("📋 Modal check:", {
        allConesScanned,
        allConesStored,
        shouldOpenModal,
      });
      
      if (shouldOpenModal) {
        // All cones scanned and stored (or empty), open modal
        console.log("✅ All cones scanned and processed, opening modal");
        
        // Auto-fill form with cone weights
        const totalConeWeight = scannedBarcodes.reduce((sum, barcode) => {
          const coneData = scannedConeData.get(barcode);
          const coneWeight = coneData?.coneWeight || coneData?.coneDetails?.coneWeight || 0;
          return sum + coneWeight;
        }, 0);
        
        setTransactionForm((prev) => ({
          ...prev,
          totalWeight: totalConeWeight > 0 ? totalConeWeight.toFixed(2) : prev.totalWeight,
          totalNetWeight: totalConeWeight > 0 ? totalConeWeight.toFixed(2) : prev.totalNetWeight,
        }));
        
        setShowReturnModal(true);
        toast.success(`All ${numberOfCones} cone(s) scanned and processed. Fill in the transaction details.`);
      } else {
        // Find next cone that needs rack barcode
        const nextConeNeedingRack = scannedBarcodes.find(b => !emptyCones.has(b) && !newRackBarcodes.has(b));
        if (nextConeNeedingRack) {
          console.log("🔄 Switching to next cone needing rack:", nextConeNeedingRack);
          setScanningMode("rack");
          setCurrentConeBarcode(nextConeNeedingRack);
          setBarcodeInput("");
        } else {
          // All cones that need rack have been stored, continue scanning more cones
          console.log("🔄 All rack cones stored, continuing to scan more cones");
          setScanningMode("cone");
          setCurrentConeBarcode(null);
          setBarcodeInput("");
        }
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

  const handleConeTypeSelection = (isEmpty: boolean) => {
    if (!pendingConeBarcode || !pendingConeData) {
      toast.error("Cone data not found.");
      setShowConeTypeModal(false);
      return;
    }

    const { coneDetails, cone, coneWeight } = pendingConeData;
    const value = pendingConeBarcode;

    // Get coneWeight from coneDetails (remaining yarn weight)
    const storedConeWeight = coneDetails?.coneWeight || coneWeight || 0;

    // Add to scanned barcodes and store cone data
    const newScannedBarcodes = [...scannedBarcodes, value];
    const newScannedConeData = new Map(scannedConeData);
    newScannedConeData.set(value, { 
      ...coneDetails, 
      cone, 
      isConeEmpty: isEmpty, 
      coneWeight: storedConeWeight,
      coneDetails: coneDetails, // Keep full coneDetails for reference
    });
    
    console.log("💾 Storing cone with coneWeight:", {
      barcode: value,
      coneWeight: storedConeWeight,
      fromConeDetails: coneDetails?.coneWeight,
    });
    
    // Update empty cones set
    const newEmptyCones = new Set(emptyCones);
    if (isEmpty) {
      newEmptyCones.add(value);
    } else {
      newEmptyCones.delete(value);
    }
    setEmptyCones(newEmptyCones);
    
    console.log("💾 Storing cone data:", {
      barcode: value,
      scannedBarcodesCount: newScannedBarcodes.length,
      coneId: cone.id,
      coneStatus: cone.status,
      isConeEmpty: isEmpty,
    });
    
    setScannedBarcodes(newScannedBarcodes);
    setScannedConeData(newScannedConeData);

    // Close modal and reset pending data
    setShowConeTypeModal(false);
    setPendingConeBarcode(null);
    setPendingConeData(null);

    // If cone is empty, skip rack scanning and proceed directly
    if (isEmpty) {
      console.log("📦 Cone is empty, skipping rack scanning");
      toast.success(`Empty cone scanned. No rack barcode needed.`);
      
      // Check if all cones have been scanned
      const numberOfCones = parseInt(transactionForm.numberOfCones) || 1;
      if (newScannedBarcodes.length >= numberOfCones) {
        // All cones scanned, check if any need rack barcode
        const conesNeedingRack = newScannedBarcodes.filter(b => !newEmptyCones.has(b));
        if (conesNeedingRack.length === 0) {
          // All cones are empty, open modal directly
          console.log("✅ All cones scanned and are empty, opening modal");
          
          // Auto-fill form with 0 weights for empty cones
          setTransactionForm((prev) => ({
            ...prev,
            totalWeight: "0",
            totalTearWeight: "0",
            totalNetWeight: "0",
          }));
          
          setShowReturnModal(true);
          toast.success(`All ${numberOfCones} cone(s) scanned. Fill in the transaction details.`);
        } else {
          // Some cones need rack barcode
          setScanningMode("rack");
          setCurrentConeBarcode(conesNeedingRack[0]);
          toast.success(`Cone scanned. Now scan the rack barcode for remaining cones.`);
        }
      } else {
        // More cones to scan, continue with next cone
        setScanningMode("cone");
        setCurrentConeBarcode(null);
      }
    } else {
      // Cone has remaining yarn, require rack barcode
      console.log("🔄 Switching to rack scanning mode for cone:", value);
      setScanningMode("rack");
      setCurrentConeBarcode(value);
      toast.success(`Cone scanned. Now scan the rack barcode for this cone.`);
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
      
      // Check if cone is already returned (from API response)
      if (coneDetails.returnStatus === "returned") {
        console.log("⚠️ Cone already returned:", value);
        toast("This cone has already been marked as returned.", {
          icon: "ℹ️",
        });
        setBarcodeInput("");
        return;
      }

      // Find the cone in the selected order (try multiple matching strategies)
      // Only search in pending cones (not returned ones) - this prevents showing returned cones
      const pendingCones = selectedOrder.cones.filter(
        (item) => item.status !== "Returned"
      );
      
      // If no pending cones, this order has no cones to return
      if (pendingCones.length === 0) {
        console.log("⚠️ No pending cones in order:", selectedOrder.orderNumber);
        toast("This order has no pending cones to return.", {
          icon: "ℹ️",
        });
        setBarcodeInput("");
        return;
      }
      
      console.log("🔎 Attempting to find cone in order by barcode:", value);
      console.log("📊 Order cones:", {
        total: selectedOrder.cones.length,
        pending: pendingCones.length,
        returned: selectedOrder.cones.length - pendingCones.length,
      });
      
      let cone = pendingCones.find(
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
          cone = pendingCones.find(
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

      // Get cone weight from API response
      const coneWeight = coneDetails.coneWeight || 0;
      
      console.log("🔍 Cone scanned, showing type selection modal:", {
        barcode: value,
        coneWeight,
        issuedWeight: coneDetails.issueWeight || cone.issuedWeight || 0,
      });

      // Store pending cone data and show modal for user to select type
      setPendingConeBarcode(value);
      setPendingConeData({ coneDetails, cone, coneWeight });
      setBarcodeInput("");
      setShowConeTypeModal(true);
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

    if (Number.isNaN(totalWeight) || totalWeight < 0) {
      toast.error("Enter a valid total weight.");
      return;
    }

    if (scannedBarcodes.length !== numberOfCones) {
      toast.error(`Number of scanned barcodes (${scannedBarcodes.length}) must match number of cones (${numberOfCones}).`);
      return;
    }

    // Check if all non-empty cones have been stored in racks
    const conesNeedingRack = scannedBarcodes.filter(barcode => !emptyCones.has(barcode));
    const allConesStored = conesNeedingRack.every(barcode => rackBarcodes.has(barcode));
    if (!allConesStored) {
      const missingRackCones = conesNeedingRack.filter(barcode => !rackBarcodes.has(barcode));
      toast.error(`All cones with remaining yarn must be stored in racks. Missing rack for: ${missingRackCones.join(", ")}`);
      return;
    }

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

        // Check if this cone is empty
        const isConeEmpty = emptyCones.has(barcode);
        
        // Get original cone weight, issued weight, and tear weight
        const originalConeWeight = coneDataFromMap?.coneWeight || 
                                   coneDataFromMap?.coneDetails?.coneWeight || 
                                   0;
        const issuedWeight = cone.issuedWeight || 
                            coneDataFromMap?.coneDetails?.issueWeight || 
                            0;
        // Use tearWeight from cone details (already on cone) or from user input
        const coneTearWeight = coneDataFromMap?.coneDetails?.tearWeight || 0;
        const userTearWeight = parseFloat(transactionForm.totalTearWeight) || 0;
        const tearWeight = coneTearWeight || userTearWeight; // Prefer cone's tearWeight, fallback to user input
        
        // For empty cones: weights are 0
        // For cones with remaining yarn: calculate remaining weight
        let weightPerCone: number;
        let tearWeightPerCone: number;
        let totalWeightPerCone: number;
        let returnWeight: number; // Remaining yarn weight to return
        
        if (isConeEmpty) {
          // Empty cone: all weights are 0
          weightPerCone = 0;
          tearWeightPerCone = 0;
          totalWeightPerCone = 0;
          returnWeight = 0;
          console.log("📦 Empty cone detected, setting all weights to 0:", barcode);
        } else {
          // Cone with remaining yarn: calculate remaining weight
          // Remaining weight = coneWeight - issuedWeight - tearWeight
          // Example: 25 - 2.2 - 0.5 = 22.3
          returnWeight = Math.max(0, originalConeWeight - issuedWeight - tearWeight);
          
          // Use user input for transaction, but returnWeight is the calculated remaining weight
          weightPerCone = totalNetWeight / numberOfCones;
          tearWeightPerCone = totalTearWeight / numberOfCones;
          totalWeightPerCone = totalWeight / numberOfCones;
          
          console.log("📦 Cone with remaining yarn, calculating weights:", {
            barcode,
            originalConeWeight,
            issuedWeight,
            tearWeight,
            returnWeight, // This is the remaining weight (22.3)
            weightPerCone, // From user input
            tearWeightPerCone,
            totalWeightPerCone,
          });
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
              let issuedTransactions = extractTransactions(txListData);
              issuedTransactions = issuedTransactions.filter((tx: any) => tx.transactionType === "yarn_issued");
              
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

        // Prepare cone update data based on whether it's empty or has remaining yarn
        const coneUpdateData: any = {
          returnStatus: "returned",
          returnWeight: returnWeight, // Use calculated remaining weight (coneWeight - issuedWeight - tearWeight)
        };

        if (isConeEmpty) {
          // Empty cone: set coneWeight = 0, tearWeight = 0, don't update storage
          coneUpdateData.coneWeight = 0;
          coneUpdateData.tearWeight = 0;
          // Don't update coneStorageId for empty cones
          console.log("📦 Updating empty cone:", {
            coneId,
            barcode,
            coneWeight: 0,
            tearWeight: 0,
            returnWeight: 0,
          });
        } else {
          // Cone with remaining yarn: update coneWeight to remaining weight, update storage location
          // Remaining weight = originalConeWeight - issuedWeight - tearWeight
          coneUpdateData.coneWeight = returnWeight; // Remaining weight (e.g., 22.3)
          coneUpdateData.tearWeight = tearWeightPerCone;
          
          // Update storage location with rack barcode
          const rackBarcode = rackBarcodes.get(barcode);
          if (rackBarcode) {
            coneUpdateData.coneStorageId = rackBarcode;
          }
          
          console.log("📦 Updating cone with remaining yarn:", {
            coneId,
            barcode,
            originalConeWeight,
            issuedWeight,
            coneTearWeight: tearWeight,
            calculatedReturnWeight: returnWeight, // 22.3
            coneWeight: returnWeight, // Updated to remaining weight
            transactionTearWeight: tearWeightPerCone,
            returnWeight: returnWeight, // Same as remaining weight
            coneStorageId: rackBarcode,
          });
        }

        // Update cone return status via separate API call
        const updateConeResponse = await fetch(`${API_BASE_URL}/yarn-management/yarn-cones/${coneId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(coneUpdateData),
        });

        if (!updateConeResponse.ok) {
          const errorData = await updateConeResponse.json().catch(() => ({}));
          console.error(`Failed to update cone return status for ${barcode}:`, errorData);
          // Continue even if status update fails, but log the error
        }

        return { barcode, cone, coneId, weightPerCone };
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
          const returnedResult = results.find((r) => r.cone.id === cone.id || r.cone.barcode === cone.barcode);
          if (returnedResult) {
            return {
              ...cone,
              returnedWeight: returnedResult.weightPerCone,
              balanceWeight: Math.max(cone.issuedWeight - returnedResult.weightPerCone, 0),
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
        setEmptyCones(new Set());
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

        // After return API 200: update assignment item yarn-return status to Completed
        if (selectedMachineAssignmentId) {
          const items = getAssignmentItemsForOrder(updatedOrder.id);
          if (items.length > 0) {
            try {
              for (const item of items) {
                await updateAssignmentItemYarnReturnStatus(
                  selectedMachineAssignmentId,
                  item.itemId,
                  "Completed"
                );
              }
              toast.success("Assignment item return status updated.");
              if (selectedMachineAssignment) loadOrdersForMachine(selectedMachineAssignment);
            } catch (err) {
              console.error("Assignment yarn-return status update failed:", err);
              toast.error("Cones returned, but failed to mark order yarn-return as completed.");
            }
          } else {
            console.warn("Assignment yarn-return status not updated: no assignment items for order", updatedOrder.orderNumber);
          }
        } else {
          console.warn("Assignment yarn-return status not updated: no selected machine assignment");
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
            const issuedData = await transactionsResponse.json();
            let issuedTransactions = extractTransactions(issuedData);
            issuedTransactions = issuedTransactions.filter((tx: any) => tx.transactionType === "yarn_issued");
            
            // Fetch returned transactions
            let returnedTransactions: any[] = [];
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
                returnedTransactions = extractTransactions(allTransactions);
                returnedTransactions = returnedTransactions.filter((tx: any) => tx.transactionType === "yarn_returned");
              }
            } catch (err) {
              console.warn("Could not fetch returned transactions:", err);
            }

            // Update cones with latest data
            const conesMap = new Map<string, Cone>();
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

                // Handle multiple cones in one transaction
                const numberOfCones = tx.numberOfCones || tx.transactionConeCount || 1;
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

            // Refresh return transactions for this order
            const newReturnTransactions = returnedTransactions as ReturnTransaction[];
            setReturnTransactions((prev) => {
              // Remove old transactions for this order and add new ones
              const filtered = prev.filter(tx => tx.orderno !== selectedOrder.orderNumber);
              return [...filtered, ...newReturnTransactions];
            });
          }
        } catch (error) {
          console.error("Error refetching transactions:", error);
          // Don't show error to user, local state is already updated
        }

        // Also refresh all return transactions to ensure we have the latest data
        try {
          const token = getAccessToken();
          const allOrderNumbers = Array.from(new Set(orders.map(o => o.orderNumber)));
          const allReturnTransactions: ReturnTransaction[] = [];
          
          await Promise.all(
            allOrderNumbers.map(async (orderNumber) => {
              try {
                const transactionsResponse = await fetch(
                  `${API_BASE_URL}/yarn-management/yarn-transactions?orderno=${orderNumber}`,
                  {
                    headers: {
                      "Content-Type": "application/json",
                      ...(token && { Authorization: `Bearer ${token}` }),
                    },
                  }
                );

                if (transactionsResponse.ok) {
                  const transactionsData = await transactionsResponse.json();
                  const transactions = extractTransactions(transactionsData);
                  const returnedTxs = transactions.filter(
                    (tx: any) => tx.transactionType === "yarn_returned"
                  ) as ReturnTransaction[];
                  allReturnTransactions.push(...returnedTxs);
                }
              } catch (err) {
                console.warn(`Failed to refresh return transactions for order ${orderNumber}:`, err);
              }
            })
          );

          setReturnTransactions(allReturnTransactions);
        } catch (error) {
          console.error("Error refreshing return transactions:", error);
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
    <div className="main-content !p-[10px]">
      <Seo title="Yarn Return" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px] border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
            <h1 className="text-sm font-bold text-gray-800">Yarn Return</h1>
            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              {pendingOrders.length}
            </span>
          </div>
        </div>

        <div className="px-[10px] pb-[10px] pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="flex items-center justify-between p-3 rounded border-l-4 border-blue-200 bg-blue-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Orders Awaiting</p>
                <p className="text-sm font-bold text-blue-600 truncate">{pendingOrders.length}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded border-l-4 border-orange-200 bg-orange-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Cones Pending</p>
                <p className="text-sm font-bold text-orange-600 truncate">{totalPendingCones}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded border-l-4 border-purple-200 bg-purple-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Cones Returned</p>
                <p className="text-sm font-bold text-purple-600 truncate">{totalReturnedCones}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded border-l-4 border-green-200 bg-green-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Orders Cleared</p>
                <p className="text-sm font-bold text-green-600 truncate">{totalCompletedOrders}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 p-[10px] pt-0">
          <div className="xl:col-span-1 flex flex-col border border-gray-200 rounded overflow-hidden bg-gray-50/30">
            <div className="p-[10px] border-b border-gray-200 bg-white">
              <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Machines (completed items)</h2>
            </div>
            <div className="p-[10px] flex-1 min-h-0 overflow-auto">
              <div className="relative mb-3">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-full placeholder:text-gray-400 font-medium"
                  placeholder="Search machine..."
                  value={machineSearchTerm}
                  onChange={(e) => setMachineSearchTerm(e.target.value)}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              </div>
              {machineAssignmentsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mb-2" />
                  <p className="text-[11px] text-gray-500">Loading machines...</p>
                </div>
              ) : (
                <AssignmentsCards
                  rows={
                    machineSearchTerm.trim()
                      ? machineAssignments.filter((a) =>
                          machineLabel(a).toLowerCase().includes(machineSearchTerm.trim().toLowerCase())
                        )
                      : machineAssignments
                  }
                  page={1}
                  limit={machineAssignments.length || 20}
                  totalResults={
                    machineSearchTerm.trim()
                      ? machineAssignments.filter((a) =>
                          machineLabel(a).toLowerCase().includes(machineSearchTerm.trim().toLowerCase())
                        ).length
                      : machineAssignments.length
                  }
                  totalPages={1}
                  isLoading={false}
                  onPageChange={() => {}}
                  readOnly
                  compact
                  nameOnly
                  onCardClick={(a) => loadOrdersForMachine(a as MachineOrderAssignmentTopItems)}
                />
              )}
            </div>
          </div>

          <div className="xl:col-span-2 space-y-4">
            {!selectedMachineAssignment ? (
              <div className="border border-gray-200 rounded overflow-hidden bg-white p-[10px]">
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                  <i className="ri-settings-3-line text-5xl text-gray-300 mb-4"></i>
                  <p className="text-[11px]">Select a machine to view its orders and cone returns.</p>
                </div>
              </div>
            ) : ordersLoading ? (
              <div className="border border-gray-200 rounded overflow-hidden bg-white p-[10px]">
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mb-2" />
                  <p className="text-[11px] text-gray-500">Loading orders and cones...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="border border-gray-200 rounded overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setOrderSelectOpen((o) => !o)}
                    className="w-full p-[10px] flex justify-between items-center border-b border-gray-100 bg-gray-50/50 hover:bg-gray-50 text-left"
                  >
                    <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Select Order</h3>
                    <span className="text-gray-500 text-sm">
                      {selectedOrder?.orderNumber ?? "—"} · {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
                    </span>
                    <i className={`ri-arrow-down-s-line text-lg text-gray-500 transition-transform ${orderSelectOpen ? "rotate-180" : ""}`} />
                  </button>
                  {orderSelectOpen && (
                    <div className="p-[10px] border-b border-gray-100">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                        {filteredOrders.map((order) => {
                          const orderReturnTransactions = returnTransactions.filter((tx) => tx.orderno === order.orderNumber);
                          const totalConesReturnedFromHistory = orderReturnTransactions.reduce((sum, tx) => sum + (tx.transactionConeCount || 1), 0);
                          const totalConesInOrder = order.cones.length;
                          const actualPendingCones = Math.max(0, totalConesInOrder - totalConesReturnedFromHistory);
                          const isSelected = selectedOrderId === order.id;
                          return (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => setSelectedOrderId(order.id)}
                              className={`text-left rounded-lg border-2 p-2.5 transition-all ${
                                isSelected
                                  ? "border-purple-500 bg-purple-50 shadow-sm ring-1 ring-purple-200"
                                  : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50"
                              }`}
                            >
                              <div className="text-[12px] font-bold text-gray-900 truncate">{order.orderNumber}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5 truncate">{order.floor}</div>
                              <div className="text-[10px] text-gray-600 mt-1 font-medium">{actualPendingCones} pending</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {selectedMachineAssignment && (
                  <div className="border border-gray-200 rounded overflow-hidden bg-white">
                    <div className="p-[10px] flex justify-between items-start gap-4 border-b border-gray-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-purple-600 uppercase tracking-wider mb-0.5">
                          Machine: {machineLabel(selectedMachineAssignment)}
                        </p>
                        {selectedOrder && (
                          <>
                            <h2 className="text-sm font-bold text-gray-800">{selectedOrder.orderNumber}</h2>
                            <p className="text-[11px] text-gray-500 mt-0.5">{selectedOrder.floor}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-[10px] pt-0">
                  <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">Pending Cone Returns ({pendingOrders.length})</h3>
                </div>
                <div className="overflow-x-auto min-h-[200px]">
                  {pendingOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="text-gray-400 mb-4">
                        <i className="ri-checkbox-circle-line text-5xl"></i>
                      </div>
                      <h3 className="text-xs font-bold text-gray-400 mb-1">All caught up!</h3>
                      <p className="text-[11px] text-gray-500">No knitting-complete orders awaiting cone return for this machine.</p>
                    </div>
                  ) : (
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50/30">
                          <th className="pl-[10px] pr-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Production Order</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Floor</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Knitting Completed</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Supervisor</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Cones</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                          <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingOrders.map((order) => {
                          const orderReturnTransactions = returnTransactions.filter((tx) => tx.orderno === order.orderNumber);
                          const totalConesReturnedFromHistory = orderReturnTransactions.reduce((sum, tx) => sum + (tx.transactionConeCount || 1), 0);
                          const totalConesInOrder = order.cones.length;
                          const actualPendingCones = Math.max(0, totalConesInOrder - totalConesReturnedFromHistory);
                          return (
                            <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="pl-[10px] pr-1.5 py-2 border border-gray-200 text-[12px] font-bold text-gray-900">{order.productionOrder}</td>
                              <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{order.floor}</td>
                              <td className="px-1.5 py-2 text-[12px] text-gray-600 border border-gray-200">{new Date(order.knittingCompletedAt).toLocaleString()}</td>
                              <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{order.knittingSupervisor}</td>
                              <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{actualPendingCones} pending</td>
                              <td className="px-1.5 py-2 border border-gray-200">
                                <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${statusBadgeColor(order.status)}`}>{order.status}</span>
                              </td>
                              <td className="px-1.5 py-2 text-right pr-[10px] border border-gray-200">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors" onClick={() => handleReturnConesClick(order.id)}>
                                    <i className="ri-reply-line text-sm"></i> Return Cones
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="border-t border-gray-100">
                  <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Return History &amp; Tracking</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-40 min-w-[100px] placeholder:text-gray-400 font-medium"
                placeholder="Search order or yarn..."
                value={historySearchTerm}
                onChange={(event) => setHistorySearchTerm(event.target.value)}
              />
              <input
                type="date"
                className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300 w-32"
                value={historyDateRange.from}
                onChange={(event) => setHistoryDateRange((prev) => ({ ...prev, from: event.target.value }))}
              />
              <input
                type="date"
                className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300 w-32"
                value={historyDateRange.to}
                onChange={(event) => setHistoryDateRange((prev) => ({ ...prev, to: event.target.value }))}
              />
            </div>
          </div>
          <div className="overflow-x-auto min-h-[200px]">
            {filteredReturnTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <i className="ri-time-line text-4xl text-gray-300 mb-2"></i>
                <h3 className="text-xs font-bold text-gray-400 mb-1">No Records</h3>
                <p className="text-[11px] text-gray-500">Adjust filters or process cone returns to see records here.</p>
              </div>
            ) : (
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="pl-[10px] pr-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Production Order</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Transaction Date</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Yarn Name</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Net (kg)</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Total (kg)</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Tear (kg)</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Cones</th>
                    <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturnTransactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="pl-[10px] pr-1.5 py-2 text-[12px] font-bold text-gray-900 border border-gray-200">{transaction.orderno}</td>
                      <td className="px-1.5 py-2 text-[12px] text-gray-600 border border-gray-200">{new Date(transaction.transactionDate).toLocaleDateString()}</td>
                      <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{transaction.yarnName}</td>
                      <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{transaction.transactionNetWeight?.toFixed(2) || "0.00"}</td>
                      <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{transaction.transactionTotalWeight?.toFixed(2) || "0.00"}</td>
                      <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{transaction.transactionTearWeight?.toFixed(2) || "0.00"}</td>
                      <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{transaction.transactionConeCount || 1}</td>
                      <td className="px-1.5 py-2 text-right pr-[10px] text-[12px] text-gray-600 border border-gray-200">{new Date(transaction.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
                </div>
              </>
            )}
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
              setEmptyCones(new Set());
              setShowConeTypeModal(false);
              setPendingConeBarcode(null);
              setPendingConeData(null);
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
                      setEmptyCones(new Set());
                      setShowConeTypeModal(false);
                      setPendingConeBarcode(null);
                      setPendingConeData(null);
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
                            Cones: {(() => {
                              // Get return transactions for this order from return history
                              const orderReturnTransactions = returnTransactions.filter(
                                (tx) => tx.orderno === selectedOrder.orderNumber
                              );
                              
                              // Count total cones returned from return transactions (from history)
                              const totalConesReturnedFromHistory = orderReturnTransactions.reduce(
                                (sum, tx) => sum + (tx.transactionConeCount || 1),
                                0
                              );
                              
                              // Total cones in the order
                              const totalConesInOrder = selectedOrder.cones.length;
                              
                              // Actual pending cones = total cones - cones returned in history
                              const actualPendingCones = Math.max(0, totalConesInOrder - totalConesReturnedFromHistory);
                              
                              return actualPendingCones;
                            })()} pending
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
                              setRackBarcodes(new Map());
                              setEmptyCones(new Set());
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
                                  const isConeEmpty = emptyCones.has(barcode);
                                  return (
                                    <span
                                      key={index}
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                        isConeEmpty 
                                          ? "bg-gray-100 text-gray-800" 
                                          : "bg-blue-100 text-blue-800"
                                      }`}
                                    >
                                      Cone: {barcode}
                                      {isConeEmpty ? (
                                        <span className="ml-1 text-gray-600">(Empty)</span>
                                      ) : rackBarcode ? (
                                        <span className="ml-1 text-green-700">→ Rack: {rackBarcode}</span>
                                      ) : (
                                        <span className="ml-1 text-orange-600">(Needs Rack)</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newBarcodes = scannedBarcodes.filter((_, i) => i !== index);
                                          const newConeData = new Map(scannedConeData);
                                          const newRackBarcodes = new Map(rackBarcodes);
                                          const newEmptyCones = new Set(emptyCones);
                                          newConeData.delete(barcode);
                                          newRackBarcodes.delete(barcode);
                                          newEmptyCones.delete(barcode);
                                          setScannedBarcodes(newBarcodes);
                                          setScannedConeData(newConeData);
                                          setRackBarcodes(newRackBarcodes);
                                          setEmptyCones(newEmptyCones);
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
                    setEmptyCones(new Set());
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
                        const isConeEmpty = emptyCones.has(barcode);
                        return (
                          <div key={index} className={`border rounded p-3 ${
                            isConeEmpty ? "bg-gray-50 border-gray-300" : "bg-white border-gray-200"
                          }`}>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Barcode:</span>
                                <span className="ml-2 font-medium">{barcode}</span>
                                {isConeEmpty && (
                                  <span className="ml-2 px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                                    Empty
                                  </span>
                                )}
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
                              <div>
                                <span className="text-gray-500">Cone Weight:</span>
                                <span className="ml-2 font-medium">
                                  {(() => {
                                    // Get coneWeight - check top level first, then coneDetails
                                    const coneWeight = coneData?.coneWeight ?? 
                                                      coneData?.coneDetails?.coneWeight ?? 
                                                      0;
                                    return typeof coneWeight === 'number' && coneWeight >= 0 
                                      ? coneWeight.toFixed(2) 
                                      : "0.00";
                                  })()} kg
                                </span>
                              </div>
                              {!isConeEmpty && rackBarcode && (
                                <div>
                                  <span className="text-gray-500">Storage Rack:</span>
                                  <span className="ml-2 font-medium text-green-700">{rackBarcode}</span>
                                </div>
                              )}
                              {isConeEmpty && (
                                <div>
                                  <span className="text-gray-500">Status:</span>
                                  <span className="ml-2 font-medium text-gray-600">No storage needed</span>
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
                        type="text"
                        inputMode="decimal"
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
                        type="text"
                        inputMode="numeric"
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
                        type="text"
                        inputMode="decimal"
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
                        type="text"
                        inputMode="decimal"
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
                        setEmptyCones(new Set());
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

      {/* Cone Type Selection Modal */}
      {showConeTypeModal && pendingConeBarcode && pendingConeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="box-header border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <h3 className="box-title text-lg">Select Cone Type</h3>
                <button
                  onClick={() => {
                    setShowConeTypeModal(false);
                    setPendingConeBarcode(null);
                    setPendingConeData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="box-body p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Barcode:</span> {pendingConeBarcode}
                </p>
                {pendingConeData.cone && (
                  <>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold">Yarn Name:</span> {pendingConeData.cone.yarnName || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold">Issued Weight:</span> {pendingConeData.cone.issuedWeight?.toFixed(2) || "N/A"} kg
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold">Cone Weight:</span> {(pendingConeData.coneWeight ?? pendingConeData.coneDetails?.coneWeight ?? 0).toFixed(2)} kg
                    </p>
                  </>
                )}
              </div>
              
              <p className="text-sm font-semibold text-gray-900 mb-4">
                Is this cone empty or does it have remaining yarn?
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleConeTypeSelection(true)}
                  className="p-6 border-2 border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center"
                >
                  <div className="text-4xl mb-2">📦</div>
                  <div className="text-lg font-semibold text-gray-900">Empty</div>
                  <div className="text-xs text-gray-500 mt-1">No yarn left</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleConeTypeSelection(false)}
                  className="p-6 border-2 border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center"
                >
                  <div className="text-4xl mb-2">🧵</div>
                  <div className="text-lg font-semibold text-gray-900">Remaining Yarn</div>
                  <div className="text-xs text-gray-500 mt-1">Has yarn left</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default YarnReturnPage;

