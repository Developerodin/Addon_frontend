"use client";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import { fetchWeightLatest } from "@/shared/data/utilities/weightApi";
import Cookies from "js-cookie";
import {
  getTopItemsAssignments,
  updateAssignmentItemYarnIssueStatus,
  type MachineOrderAssignmentTopItems,
  type PopulatedOrderRef,
  type PopulatedArticleRef,
} from "@/shared/services/machineOrderAssignmentService";
import AssignmentsCards from "@/app/catalog/needle-configuration/components/AssignmentsCards";

type RequirementStatus = "Not Issued" | "Partially Issued" | "Issued";

interface YarnTransaction {
  _id: string;
  yarn: {
    _id: string;
    status: string;
    yarnType: {
      status: string;
      _id: string;
      name: string;
    };
    yarnName: string;
  };
  yarnName: string;
  transactionType: string;
  transactionDate: string;
  transactionNetWeight: number;
  transactionTotalWeight: number;
  transactionTearWeight: number;
  transactionConeCount: number;
  orderId?: string;
  orderno: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
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
  orderNumber: string;
  buyer: string;
  floor: string;
  styleCode: string;
  scheduledDate: string;
  notes?: string;
  bom: YarnRequirement[];
  articles?: Article[];
  articleBoms?: Map<string, YarnRequirement[]>; // Store BOM for each article
}

interface ProductBOMItem {
  _id: string;
  yarnCatalogId: string | {
    id: string;
    yarnName: string;
    yarnType?: {
      id: string;
      name: string;
      status: string;
    };
    countSize?: {
      id: string;
      name: string;
      status: string;
    };
    blend?: {
      id: string;
      name: string;
      status: string;
    };
    colorFamily?: {
      id: string;
      name: string;
      colorCode?: string;
      status: string;
    };
  };
  yarnName: string;
  quantity: number; // Quantity in grams per unit
}

interface Product {
  id: string;
  styleCode: string;
  name: string;
  bom: ProductBOMItem[];
}

type YarnSortField =
  | "yarnName"
  | "yarnCode"
  | "requiredQty"
  | "issuedQty"
  | "status";

const ISSUE_TOLERANCE_DEFAULT = 0.2;

/** Match by production order _id when present; fallback to orderno for legacy transactions. */
const getIssuedQty = (
  requirement: YarnRequirement,
  transactions: YarnTransaction[],
  order: { id: string; orderNumber: string }
) => {
  return transactions
    .filter(
      (t) =>
        t.yarnName === requirement.yarnName &&
        t.transactionType === "yarn_issued" &&
        (t.orderId ? t.orderId === order.id : t.orderno === order.orderNumber)
    )
    .reduce((sum, t) => sum + t.transactionNetWeight, 0);
};

const getRequirementStatus = (
  requirement: YarnRequirement,
  transactions: YarnTransaction[],
  order: { id: string; orderNumber: string }
): RequirementStatus => {
  const issued = getIssuedQty(requirement, transactions, order);
  const issuedInGrams = issued * 1000; // Convert kg to grams for comparison
  if (issuedInGrams === 0) {
    return "Not Issued";
  }

  if (issuedInGrams + 0.0001 < requirement.requiredQty) {
    return "Partially Issued";
  }

  return "Issued";
};

const getOrderStatus = (order: ProductionOrder, transactions: YarnTransaction[]): RequirementStatus => {
  // If BOM is empty, order is not issued yet
  if (!order.bom || order.bom.length === 0) {
    return "Not Issued";
  }
  
  const requirementStatuses = order.bom.map((req) => getRequirementStatus(req, transactions, order));
  if (requirementStatuses.every((status) => status === "Issued")) {
    return "Issued";
  }
  if (requirementStatuses.some((status) => status === "Partially Issued")) {
    return "Partially Issued";
  }
  return "Not Issued";
};

// Get total required and issued quantities across all articles in an order
const getOrderTotals = (order: ProductionOrder, transactions: YarnTransaction[]) => {
  const totals = { issued: 0, required: 0 };
  
  // If articleBoms exists, calculate total across all articles
  if (order.articleBoms && order.articleBoms.size > 0) {
    // Create a map to aggregate yarn requirements by yarn name
    const aggregatedYarns = new Map<string, { required: number; requirement: YarnRequirement }>();
    
    // First, aggregate all requirements by yarn name (sum up required quantities)
    order.articleBoms.forEach((articleBom) => {
      articleBom.forEach((requirement) => {
        const existing = aggregatedYarns.get(requirement.yarnName);
        if (existing) {
          // Add to existing required quantity
          aggregatedYarns.set(requirement.yarnName, {
            required: existing.required + requirement.requiredQty,
            requirement: existing.requirement, // Keep the first requirement for getting issued qty
          });
        } else {
          // First time seeing this yarn
          aggregatedYarns.set(requirement.yarnName, {
            required: requirement.requiredQty,
            requirement: requirement,
          });
        }
      });
    });
    
    // Now calculate issued quantity ONCE per unique yarn name and sum up
    aggregatedYarns.forEach((value) => {
      totals.required += value.required;
      // Get issued qty only once per yarn name (not per article)
      totals.issued += getIssuedQty(value.requirement, transactions, order);
    });
  } else if (order.bom && order.bom.length > 0) {
    // Fallback to current BOM if articleBoms not available
    // Create a map to avoid double counting issued qty for same yarn
    const yarnMap = new Map<string, YarnRequirement>();
    
    order.bom.forEach((requirement) => {
      totals.required += requirement.requiredQty;
      // Store unique yarn names to avoid counting issued qty multiple times
      if (!yarnMap.has(requirement.yarnName)) {
        yarnMap.set(requirement.yarnName, requirement);
      }
    });
    
    // Get issued qty once per unique yarn name
    yarnMap.forEach((requirement) => {
      totals.issued += getIssuedQty(requirement, transactions, order);
    });
  }
  
  return totals;
};

const formatKg = (value: number) => {
  // For very small values, show up to 4 decimal places
  // Remove trailing zeros but keep at least 2 decimal places
  const formatted = value.toFixed(4);
  const trimmed = formatted.replace(/\.?0+$/, '');
  // Ensure at least 2 decimal places for consistency
  const parts = trimmed.split('.');
  if (parts.length === 1) {
    return `${trimmed}.00 g`;
  } else if (parts[1].length === 1) {
    return `${trimmed}0 g`;
  }
  return `${trimmed} g`;
};

const formatKgDisplay = (valueInGrams: number) => {
  // Convert grams to kg and format with kg symbol
  const valueInKg = valueInGrams / 1000;
  // Format to 2 decimal places, remove trailing zeros
  const formatted = valueInKg.toFixed(2);
  const trimmed = formatted.replace(/\.?0+$/, '');
  // Ensure at least 2 decimal places for consistency
  const parts = trimmed.split('.');
  if (parts.length === 1) {
    return `${trimmed}.00 kg`;
  } else if (parts[1].length === 1) {
    return `${trimmed}0 kg`;
  }
  return `${trimmed} kg`;
};

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

const ORDERS_PAGE_SIZE = 10;

/** Machine label for display (code or name) */
function machineLabel(a: MachineOrderAssignmentTopItems): string {
  const m = a.machine;
  if (typeof m === "object" && m) {
    return (m as { machineCode?: string; name?: string; id?: string }).machineCode ?? (m as { name?: string }).name ?? (m as { id?: string }).id ?? "—";
  }
  return typeof m === "string" ? m : "—";
}

const YarnIssuePage = () => {
  const { hasSubPermission, isLoading } = useNavigation();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersTotalResults, setOrdersTotalResults] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [machineAssignments, setMachineAssignments] = useState<MachineOrderAssignmentTopItems[]>([]);
  const [machineAssignmentsLoading, setMachineAssignmentsLoading] = useState(true);
  const [selectedMachineAssignmentId, setSelectedMachineAssignmentId] = useState<string | null>(null);
  const [selectedMachineAssignment, setSelectedMachineAssignment] = useState<MachineOrderAssignmentTopItems | null>(null);
  const [orderSelectOpen, setOrderSelectOpen] = useState(true);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [activeRequirementId, setActiveRequirementId] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [sortField, setSortField] = useState<YarnSortField>("yarnName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [productLoading, setProductLoading] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [coneData, setConeData] = useState<any>(null);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    totalWeight: "",
    numberOfCones: "",
    totalTearWeight: "",
    totalNetWeight: "",
  });
  const [submittingTransaction, setSubmittingTransaction] = useState(false);
  const [showScanIssuePanel, setShowScanIssuePanel] = useState(false);
  const [showActivityLogPanel, setShowActivityLogPanel] = useState(false);
  const [completingYarnIssue, setCompletingYarnIssue] = useState(false);
  const [yarnTransactions, setYarnTransactions] = useState<YarnTransaction[]>([]);
  const [allYarnTransactions, setAllYarnTransactions] = useState<YarnTransaction[]>([]); // For order status calculations
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [fetchingWeight, setFetchingWeight] = useState(false);

  const hasPermission = hasSubPermission("/yarn-management", "Yarn Issue");

  // When issue modal opens, fetch latest weight from scale (localhost or 192.168.0.28) and pre-fill
  useEffect(() => {
    if (!showIssueModal) return;
    let cancelled = false;
    (async () => {
      const w = await fetchWeightLatest();
      if (cancelled || w == null || w <= 0) return;
      setTransactionForm((prev) => {
        const tear = parseFloat(prev.totalTearWeight) || 0;
        return {
          ...prev,
          totalWeight: w.toFixed(2),
          totalNetWeight: (w - tear).toFixed(2),
        };
      });
    })();
    return () => { cancelled = true; };
  }, [showIssueModal]);

  // Fetch all yarn-issued transactions for order status calculations (on initial load)
  useEffect(() => {
    const fetchAllTransactions = async () => {
      if (!hasPermission) return;
      
      try {
        const token = getAccessToken();
        const response = await fetch(
          `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-issued`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch yarn transactions");
        }

        const data = await response.json();
        setAllYarnTransactions(data || []);
      } catch (error) {
        console.error("Error fetching all yarn transactions:", error);
        // Don't show toast for this as it's a background fetch
      }
    };

    fetchAllTransactions();
  }, [hasPermission]);

  // Fetch yarn-issued transactions with date filters for logs panel
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!hasPermission || !showActivityLogPanel) return;
      
      setTransactionsLoading(true);
      try {
        const token = getAccessToken();
        
        // Build query parameters for date filtering
        const queryParams = new URLSearchParams();
        if (startDate) {
          queryParams.append("start_date", startDate);
        }
        if (endDate) {
          queryParams.append("end_date", endDate);
        }
        
        const url = `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-issued${
          queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`;
        
        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch yarn transactions");
        }

        const data = await response.json();
        setYarnTransactions(data || []);
      } catch (error) {
        console.error("Error fetching yarn transactions:", error);
        toast.error("Failed to load yarn transactions");
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
  }, [hasPermission, showActivityLogPanel, startDate, endDate]);

  // Fetch top-items (machines with active PO items) – single API, all data included
  useEffect(() => {
    const fetchTopItems = async () => {
      setMachineAssignmentsLoading(true);
      try {
        const list = await getTopItemsAssignments();
        setMachineAssignments(list);
        setOrdersTotalResults(list.length);
        setOrdersTotalPages(1);
      } catch (error) {
        console.error("Error fetching top-items:", error);
        toast.error("Failed to load machines");
        setMachineAssignments([]);
      } finally {
        setMachineAssignmentsLoading(false);
      }
    };

    if (hasPermission) {
      fetchTopItems();
    }
  }, [hasPermission]);

  /** Build orders + articles from top-items assignment (no extra API calls – use data as received). */
  const loadOrdersForMachine = useCallback((assignment: MachineOrderAssignmentTopItems) => {
    const items = assignment.productionOrderItems ?? [];
    if (items.length === 0) {
      setOrders([]);
      setSelectedOrderId(null);
      setSelectedArticleId(null);
      setSelectedMachineAssignmentId(null);
      setSelectedMachineAssignment(null);
      return;
    }
    setSelectedMachineAssignmentId(assignment.id);
    setSelectedMachineAssignment(assignment);

    const orderMap = new Map<string, { order: PopulatedOrderRef; articles: { article: PopulatedArticleRef; item: (typeof items)[0] }[] }>();
    for (const item of items) {
      const po = item.productionOrder;
      const art = item.article;
      const orderId = typeof po === "string" ? po : (po?.id ?? po?._id ?? "");
      const orderObj = typeof po === "object" ? po : null;
      const articleObj = typeof art === "object" ? art : null;
      if (!orderId || !articleObj) continue;
      if (!orderMap.has(orderId)) {
        orderMap.set(orderId, {
          order: orderObj ?? ({} as PopulatedOrderRef),
          articles: [],
        });
      }
      orderMap.get(orderId)!.articles.push({ article: articleObj, item });
    }

    const builtOrders: ProductionOrder[] = [];
    orderMap.forEach((value, orderId) => {
      const { order, articles } = value;
      const firstItem = articles[0]?.item;
      const orderNumber = order?.orderNumber ?? firstItem?.orderNumber ?? "";
      builtOrders.push({
        id: orderId,
        orderNumber,
        buyer: order?.orderNote ?? "N/A",
        floor: order?.currentFloor ?? "N/A",
        styleCode: "",
        scheduledDate: order?.createdAt ?? new Date().toISOString(),
        notes: order?.orderNote,
        bom: [],
        articles: articles.map(({ article, item: it }) => ({
          id: article?.id ?? article?._id ?? "",
          _id: article?._id,
          articleNumber: article?.articleNumber ?? it?.articleNumber ?? "",
          plannedQuantity: article?.plannedQuantity ?? 0,
          linkingType: (article?.linkingType as any) ?? "Auto Linking",
          priority: (article?.priority as any) ?? "Medium",
          status: (article?.status as any) ?? "Pending",
          machineId: undefined,
          remarks: article?.remarks,
        })),
      });
    });

    setOrders(builtOrders);
    const first = builtOrders[0];
    if (first?.id) {
      setSelectedOrderId(first.id);
      setSelectedArticleId(first.articles?.[0]?.id ?? null);
    } else {
      setSelectedOrderId(null);
      setSelectedArticleId(null);
    }
  }, []);

  // Default: select first machine and its first order when machines have loaded
  useEffect(() => {
    if (!machineAssignmentsLoading && machineAssignments.length > 0 && selectedMachineAssignmentId === null) {
      loadOrdersForMachine(machineAssignments[0]);
    }
  }, [machineAssignmentsLoading, machineAssignments, selectedMachineAssignmentId, loadOrdersForMachine]);

  // Fetch product details for a single article
  const fetchArticleBOM = async (
    orderId: string,
    articleId: string,
    articleNumber: string,
    articlePlannedQty: number,
    token: string | null
  ): Promise<{ yarnRequirements: YarnRequirement[]; styleCode: string } | null> => {
    try {
      let product: Product | null = null;

      // Strategy 1: Fetch product by factoryCode
      try {
        const searchResponse = await fetch(
          `${API_BASE_URL}/products/by-code?factoryCode=${encodeURIComponent(articleNumber)}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (searchResponse.ok) {
          const productData = await searchResponse.json();
          console.log("Product fetched by factoryCode:", productData);
          if (productData && productData.bom && Array.isArray(productData.bom) && productData.bom.length > 0) {
            product = productData;
            console.log("Product BOM found:", productData.bom);
          } else {
            console.warn("Product found but no BOM or empty BOM:", productData);
          }
        } else {
          const errorData = await searchResponse.json().catch(() => ({}));
          console.warn("Product fetch by factoryCode failed:", searchResponse.status, errorData);
        }
      } catch (error) {
        console.warn("Product fetch by factoryCode failed:", error);
      }

      // Strategy 2: If not found, try direct fetch
      if (!product) {
        try {
          const directResponse = await fetch(`${API_BASE_URL}/products/${articleNumber}`, {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });

          if (directResponse.ok) {
            const directProduct = await directResponse.json();
            if (directProduct.bom && directProduct.bom.length > 0) {
              product = directProduct;
            }
          }
        } catch (error) {
          console.warn("Direct product fetch failed:", error);
        }
      }

      if (!product || !product.bom || !Array.isArray(product.bom) || product.bom.length === 0) {
        console.error("Product not found or no BOM for article:", articleNumber);
        return null;
      }

      // Map product BOM to yarn requirements
      console.log("Processing BOM, product.bom:", product.bom);
      const yarnRequirements: YarnRequirement[] = product.bom.map((bomItem, index) => {
        let yarnCode = `YARN-${index}`;
        let yarnType = "Unknown";
        
        if (typeof bomItem.yarnCatalogId === "string") {
          yarnCode = bomItem.yarnCatalogId;
        } else if (bomItem.yarnCatalogId && typeof bomItem.yarnCatalogId === "object") {
          yarnCode = bomItem.yarnCatalogId.id || yarnCode;
          if (bomItem.yarnCatalogId.yarnType?.name) {
            yarnType = bomItem.yarnCatalogId.yarnType.name;
          }
        }

        if (yarnType === "Unknown" && bomItem.yarnName) {
          const parts = bomItem.yarnName.split("-");
          if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1];
            const typeParts = lastPart.split("/");
            if (typeParts.length > 0 && typeParts[0].trim()) {
              yarnType = typeParts[0].trim();
            } else if (lastPart.trim()) {
              yarnType = lastPart.trim();
            }
          }
        }

        return {
          id: `req-${bomItem._id}-${articleId}-${index}`,
          yarnCode: yarnCode,
          yarnName: bomItem.yarnName || "Unknown Yarn",
          yarnType: yarnType,
          requiredQty: bomItem.quantity * articlePlannedQty, // Multiply per-unit quantity by article planned quantity
          tolerancePercent: ISSUE_TOLERANCE_DEFAULT,
          shortTermAvailable: 0,
          longTermAvailable: 0,
        };
      });

      return {
        yarnRequirements,
        styleCode: product?.styleCode || articleNumber,
      };
    } catch (error) {
      console.error("Error fetching product for article:", articleNumber, error);
      return null;
    }
  };

  // Fetch BOMs for all articles when order is selected
  useEffect(() => {
    const fetchAllArticleBOMs = async () => {
      if (!selectedOrderId) {
        return;
      }

      const selectedOrder = orders.find((o) => o.id === selectedOrderId);
      if (!selectedOrder || !selectedOrder.articles || selectedOrder.articles.length === 0) {
        return;
      }

      setProductLoading(true);
      try {
        const token = getAccessToken();
        const articleBoms = new Map<string, YarnRequirement[]>();
        let firstStyleCode = "";

        // Fetch BOM for all articles in parallel
        const fetchPromises = selectedOrder.articles.map(async (article) => {
          const result = await fetchArticleBOM(
            selectedOrderId,
            article.id,
            article.articleNumber,
            article.plannedQuantity || 1,
            token
          );
          
          if (result) {
            articleBoms.set(article.id, result.yarnRequirements);
            if (!firstStyleCode) {
              firstStyleCode = result.styleCode;
            }
          }
          
          return { articleId: article.id, result };
        });

        await Promise.all(fetchPromises);

        console.log("All article BOMs fetched:", articleBoms.size);

        // Combine all BOMs for "All" view WITHOUT aggregation
        const allBoms: YarnRequirement[] = [];
        articleBoms.forEach((articleBom, articleId) => {
          articleBom.forEach((requirement) => {
            allBoms.push({
              ...requirement,
              id: `${articleId}-${requirement.id}`,
            });
          });
        });

        // Update the order with all article BOMs
        setOrders((prev) => {
          const updated = prev.map((order) => {
            if (order.id !== selectedOrderId) {
              return order;
            }
            
            // Use combined BOM by default (for "All" view)
            const currentBom = selectedArticleId === "all" || !selectedArticleId 
              ? allBoms 
              : articleBoms.get(selectedArticleId) || allBoms;
            
            const updatedOrder = {
              ...order,
              styleCode: firstStyleCode || order.styleCode,
              bom: currentBom,
              articleBoms,
            };
            console.log("Updated order with all BOMs:", updatedOrder);
            return updatedOrder;
          });
          
          return updated;
        });

        // Auto-select first requirement
        if (allBoms.length > 0) {
          setActiveRequirementId(allBoms[0].id);
        }
      } catch (error) {
        console.error("Error fetching article BOMs:", error);
        toast.error("Failed to load product details");
      } finally {
        setProductLoading(false);
      }
    };

    fetchAllArticleBOMs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderId]);

  // Update displayed BOM when article selection changes
  useEffect(() => {
    if (!selectedOrderId || !selectedArticleId) {
      return;
    }

    setOrders((prev) => {
      const selectedOrder = prev.find((o) => o.id === selectedOrderId);
      if (!selectedOrder || !selectedOrder.articleBoms) {
        return prev;
      }

      // Check if "All" is selected
      if (selectedArticleId === "all") {
        // Combine all yarn requirements from all articles WITHOUT aggregation
        const allBoms: YarnRequirement[] = [];
        
        selectedOrder.articleBoms.forEach((articleBom, articleId) => {
          articleBom.forEach((requirement) => {
            // Keep each requirement separate with unique ID
            allBoms.push({
              ...requirement,
              id: `${articleId}-${requirement.id}`, // Ensure unique ID per article
            });
          });
        });
        
        const updated = prev.map((order) => {
          if (order.id !== selectedOrderId) {
            return order;
          }
          return {
            ...order,
            bom: allBoms,
          };
        });

        // Auto-select first requirement
        if (allBoms.length > 0) {
          setActiveRequirementId(allBoms[0].id);
        }

        return updated;
      } else {
        // Show BOM for specific article
        const articleBom = selectedOrder.articleBoms.get(selectedArticleId);
        if (articleBom) {
          const updated = prev.map((order) => {
            if (order.id !== selectedOrderId) {
              return order;
            }
            return {
              ...order,
              bom: articleBom,
            };
          });

          // Auto-select first requirement of this article
          if (articleBom.length > 0) {
            setActiveRequirementId(articleBom[0].id);
          }

          return updated;
        }
      }

      return prev;
    });
  }, [selectedArticleId, selectedOrderId]);

  // Debug: Track when orders change (removed to prevent console spam)
  // useEffect(() => {
  //   console.log("Orders state changed, total orders:", orders.length);
  //   const selectedOrderInState = orders.find((o) => o.id === selectedOrderId);
  //   if (selectedOrderInState) {
  //     console.log("Selected order in orders state:", {
  //       id: selectedOrderInState.id,
  //       bomLength: selectedOrderInState.bom?.length || 0,
  //       bom: selectedOrderInState.bom,
  //     });
  //   }
  // }, [orders, selectedOrderId]);

  // Use yarnTransactions directly since API handles filtering
  const filteredTransactions = yarnTransactions;

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      // Show all orders regardless of status
      if (!query) {
        return true;
      }

      return (
        order.orderNumber.toLowerCase().includes(query) ||
        (order.buyer && order.buyer.toLowerCase().includes(query)) ||
        (order.floor && order.floor.toLowerCase().includes(query)) ||
        (order.styleCode && order.styleCode.toLowerCase().includes(query))
      );
    });
  }, [orders, searchTerm]);

  // Sync selection to filtered orders. Don't clear selection when orders are empty (initial load race);
  // only clear when we had orders but they're all filtered out (e.g. by search).
  useEffect(() => {
    if (!filteredOrders.length) {
      if (orders.length > 0) {
        setSelectedOrderId(null);
        setSelectedArticleId(null);
      }
      return;
    }

    if (!selectedOrderId || !filteredOrders.some((order) => order.id === selectedOrderId)) {
      const firstOrder = filteredOrders[0];
      setSelectedOrderId(firstOrder.id);
      if (firstOrder.articles && firstOrder.articles.length > 0) {
        setSelectedArticleId(firstOrder.articles[0].id);
      } else {
        setSelectedArticleId(null);
      }
    }
  }, [filteredOrders, selectedOrderId, orders.length]);

  const selectedOrder = useMemo(
    () => filteredOrders.find((order) => order.id === selectedOrderId) ?? null,
    [filteredOrders, selectedOrderId]
  );

  // Debug: Log when selectedOrder changes (removed to prevent console spam)
  // useEffect(() => {
  //   console.log("selectedOrder changed:", selectedOrder);
  //   if (selectedOrder) {
  //     console.log("selectedOrder.bom:", selectedOrder.bom, "length:", selectedOrder.bom?.length);
  //   }
  // }, [selectedOrder]);

  const selectedArticle = useMemo(() => {
    if (!selectedOrder || !selectedOrder.articles || !selectedArticleId) {
      return null;
    }
    return selectedOrder.articles.find((article) => article.id === selectedArticleId) ?? null;
  }, [selectedOrder, selectedArticleId]);

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
          aValue = getIssuedQty(a, allYarnTransactions, selectedOrder);
          bValue = getIssuedQty(b, allYarnTransactions, selectedOrder);
          break;
        case "status":
          aValue = getRequirementStatus(a, allYarnTransactions, selectedOrder);
          bValue = getRequirementStatus(b, allYarnTransactions, selectedOrder);
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
  }, [selectedOrder, sortField, sortDirection, allYarnTransactions]);

  /** True when a single article is selected and every BOM requirement for it is fully issued. */
  const allBomIssuedForCurrentArticle = useMemo(() => {
    if (!selectedOrder || !selectedArticleId || selectedArticleId === "all" || !selectedOrder.bom?.length) return false;
    return selectedOrder.bom.every((r) =>
      getRequirementStatus(r, allYarnTransactions, selectedOrder) === "Issued"
    );
  }, [selectedOrder, selectedArticleId, allYarnTransactions]);

  /** Assignment item id for current order+article (for PATCH yarn-issue-status). */
  const assignmentItemIdForCurrent = useMemo(() => {
    if (!selectedMachineAssignment || !selectedOrderId || !selectedArticleId || selectedArticleId === "all") return null;
    const items = selectedMachineAssignment.productionOrderItems ?? [];
    const match = items.find((i) => {
      const poId = typeof i.productionOrder === "string" ? i.productionOrder : (i.productionOrder?.id ?? i.productionOrder?._id);
      const artId = typeof i.article === "string" ? i.article : (i.article?.id ?? i.article?._id);
      return String(poId) === String(selectedOrderId) && String(artId) === String(selectedArticleId);
    });
    return match?.itemId ?? match?.id ?? null;
  }, [selectedMachineAssignment, selectedOrderId, selectedArticleId]);

  const canMarkYarnIssueCompleted = Boolean(
    allBomIssuedForCurrentArticle && assignmentItemIdForCurrent && selectedMachineAssignment?.id
  );

  const handleMarkYarnIssueCompleted = useCallback(async () => {
    if (!canMarkYarnIssueCompleted || !selectedMachineAssignment?.id || !assignmentItemIdForCurrent) return;
    setCompletingYarnIssue(true);
    try {
      await updateAssignmentItemYarnIssueStatus(
        selectedMachineAssignment.id,
        assignmentItemIdForCurrent,
        "Completed"
      );
      toast.success("Yarn issue marked as Completed");
      const list = await getTopItemsAssignments();
      setMachineAssignments(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update yarn issue status";
      toast.error(msg);
    } finally {
      setCompletingYarnIssue(false);
    }
  }, [canMarkYarnIssueCompleted, selectedMachineAssignment?.id, assignmentItemIdForCurrent]);

  const SortIcon = ({ field }: { field: YarnSortField }) => {
    if (sortField !== field) {
      return <i className="ri-arrow-up-down-line text-gray-400 text-sm" />;
    }
    return sortDirection === "asc" ? (
      <i className="ri-arrow-up-line text-purple-600 text-sm" />
    ) : (
      <i className="ri-arrow-down-line text-purple-600 text-sm" />
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
  };

  const handleStartIssuing = (requirementId: string) => {
    setActiveRequirementId(requirementId);
    resetScanState();
    setShowScanIssuePanel(true);
  };

  const handleBarcodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!barcodeInput.trim()) {
      toast.error("Scan the cone barcode before proceeding.");
      return;
    }

    if (!activeRequirement) {
      toast.error("Select a yarn requirement first.");
      return;
    }

    setBarcodeLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/yarn-management/yarn-cones/barcode/${barcodeInput.trim()}`,
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
      setConeData(coneDetails);
      
      // Reset form
      setTransactionForm({
        totalWeight: "",
        numberOfCones: "1",
        totalTearWeight: coneDetails.tearWeight?.toString() || "0",
        totalNetWeight: "",
      });
      
      setShowIssueModal(true);
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

  const handleIssueSubmit = async () => {
    if (!selectedOrder || !activeRequirement || !coneData) {
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

    if (Number.isNaN(numberOfCones) || numberOfCones <= 0) {
      toast.error("Enter a valid number of cones.");
      return;
    }

    // Get yarnCatalogId from the requirement
    // We need to find it from the product BOM that was loaded
    // For now, we'll use the yarnCode which should be the yarnCatalogId
    const yarnCatalogId = activeRequirement.yarnCode;

    const currentIssued = getIssuedQty(activeRequirement, allYarnTransactions, selectedOrder);
    const currentIssuedInGrams = currentIssued * 1000;

    setSubmittingTransaction(true);
    try {
      const token = getAccessToken();
      const transactionDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      // Backend schema: transactionNetWeight, transactionTotalWeight, transactionTearWeight, transactionConeCount; orderId, orderno, articleId, articleNumber, machineId
      const machine = selectedMachineAssignment?.machine;
      const machineId =
        typeof machine === "object" && machine
          ? (machine as { _id?: string; id?: string })._id ?? (machine as { id?: string }).id
          : typeof machine === "string"
            ? machine
            : undefined;

      const transactionData = {
        yarn: yarnCatalogId,
        yarnName: activeRequirement.yarnName,
        transactionType: "yarn_issued",
        transactionDate: transactionDate,
        transactionNetWeight: totalNetWeight,
        transactionTotalWeight: totalWeight,
        transactionTearWeight: totalTearWeight,
        transactionConeCount: numberOfCones,
        orderno: selectedOrder.orderNumber,
        orderId: selectedOrder.id || undefined,
        conesIdsArray: coneData?._id ? [coneData._id] : [],
        ...(selectedArticle && {
          articleNumber: selectedArticle.articleNumber,
          articleId: selectedArticle._id ?? selectedArticle.id,
        }),
        ...(machineId && { machineId }),
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
        throw new Error(errorData.message || "Failed to create transaction");
      }

      // Update cone issueStatus to "issued" after successful transaction
      if (coneData && coneData._id) {
        try {
          const updateConeResponse = await fetch(
            `${API_BASE_URL}/yarn-management/yarn-cones/${coneData._id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                issueStatus: "issued",
                issueDate: new Date().toISOString(),
                issueWeight: totalNetWeight,
              }),
            }
          );

          if (!updateConeResponse.ok) {
            console.error("Failed to update cone issueStatus");
            // Don't throw error here, transaction is already created
            // Just log it so the transaction isn't rolled back
          }
        } catch (coneUpdateError) {
          console.error("Error updating cone issueStatus:", coneUpdateError);
          // Don't throw error here, transaction is already created
        }
      }

      // Refresh all transactions after successful issue
      const refreshResponse = await fetch(
        `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-issued`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json();
        setAllYarnTransactions(refreshedData || []);
        
        // Also refresh filtered transactions if logs panel is open
        if (showActivityLogPanel) {
          const queryParams = new URLSearchParams();
          if (startDate) {
            queryParams.append("start_date", startDate);
          }
          if (endDate) {
            queryParams.append("end_date", endDate);
          }
          
          const filteredUrl = `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-issued${
            queryParams.toString() ? `?${queryParams.toString()}` : ""
          }`;
          
          const filteredResponse = await fetch(filteredUrl, {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });
          
          if (filteredResponse.ok) {
            const filteredData = await filteredResponse.json();
            setYarnTransactions(filteredData || []);
          }
        }
      }

      const updatedTotalInGrams = (currentIssued * 1000) + (totalNetWeight * 1000); // Convert both to grams for comparison
      const statusAfterIssue = updatedTotalInGrams + 0.0001 >= activeRequirement.requiredQty ? "Issued" : "Partially Issued";

      toast.success(
        `${formatKg(totalNetWeight * 1000)} issued successfully. Status: ${statusAfterIssue}.`
      );

      // Close modal and reset
      setShowIssueModal(false);
      resetScanState();
      setConeData(null);
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error(error instanceof Error ? error.message : "Failed to issue yarn. Please try again.");
    } finally {
      setSubmittingTransaction(false);
    }
  };

  if (isLoading || ordersLoading) {
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
            <p className="text-[11px] text-gray-500 mb-4">You don't have permission to access Yarn Issue.</p>
            <Link href="/yarn-management" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
              <i className="ri-arrow-left-line"></i> Back to Yarn Management
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Yarn Issue" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px] border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Yarn Issue</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {filteredOrders.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowActivityLogPanel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-[11px] font-bold text-gray-700 rounded hover:bg-gray-50 transition-colors"
              title="View Issue Activity Log"
            >
              <i className="ri-file-list-3-line"></i>
              Logs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 p-[10px] pt-0">
          <div className="xl:col-span-1 flex flex-col border border-gray-200 rounded overflow-hidden bg-gray-50/30">
            <div className="p-[10px] border-b border-gray-200 bg-white">
              <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Machines (with active PO items)</h2>
            </div>
            <div className="p-[10px] flex-1 min-h-0 overflow-auto">
              <div className="relative mb-3">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-full placeholder:text-gray-400 font-medium"
                  placeholder="Search machine..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
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
                  rows={searchTerm.trim()
                    ? machineAssignments.filter((a) =>
                        machineLabel(a).toLowerCase().includes(searchTerm.trim().toLowerCase())
                      )
                    : machineAssignments}
                  page={1}
                  limit={machineAssignments.length || 20}
                  totalResults={searchTerm.trim() ? machineAssignments.filter((a) =>
                    machineLabel(a).toLowerCase().includes(searchTerm.trim().toLowerCase())
                  ).length : machineAssignments.length}
                  totalPages={1}
                  isLoading={false}
                  onPageChange={() => {}}
                  readOnly
                  compact
                  nameOnly
                  onCardClick={(a) => loadOrdersForMachine(a)}
                />
              )}
            </div>
          </div>

        <div className="xl:col-span-2 space-y-4">
          {!selectedOrder ? (
            <div className="border border-gray-200 rounded overflow-hidden bg-white p-[10px]">
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                <i className="ri-settings-3-line text-5xl text-gray-300 mb-4"></i>
                <p className="text-[11px]">Select a machine to view its orders, articles and yarn requirements.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Order select – expandable section with order cards */}
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
                        const issuedTotals = getOrderTotals(order, allYarnTransactions);
                        const isSelected = selectedOrderId === order.id;
                        return (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setSelectedArticleId(order?.articles?.[0]?.id ?? null);
                            }}
                            className={`text-left rounded-lg border-2 p-2.5 transition-all ${
                              isSelected
                                ? "border-purple-500 bg-purple-50 shadow-sm ring-1 ring-purple-200"
                                : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50"
                            }`}
                          >
                            <div className="text-[12px] font-bold text-gray-900 truncate">{order.orderNumber}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5 truncate">{order.buyer} · {order.floor}</div>
                            <div className="text-[10px] text-gray-600 mt-1 font-medium">
                              {issuedTotals.issued.toFixed(2)} / {(issuedTotals.required / 1000).toFixed(2)} kg
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded overflow-hidden bg-white">
                <div className="p-[10px] flex justify-between items-start gap-4 border-b border-gray-100">
                  <div className="min-w-0 flex-1">
                    {selectedMachineAssignment && (
                      <p className="text-[10px] font-medium text-purple-600 uppercase tracking-wider mb-0.5">
                        Machine: {machineLabel(selectedMachineAssignment)}
                      </p>
                    )}
                    <h2 className="text-sm font-bold text-gray-800">{selectedOrder.orderNumber}</h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">{selectedOrder.buyer} • {selectedOrder.floor}</p>
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-1.5 shrink-0">
                    <i className="ri-calendar-check-line"></i>
                    {new Date(selectedOrder.scheduledDate).toLocaleDateString()}
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="p-[10px] border-t border-gray-100 bg-gray-50/50 text-[11px] text-gray-600">
                    <i className="ri-information-line text-purple-600 me-1"></i>
                    {selectedOrder.notes}
                  </div>
                )}
              </div>

              {selectedOrder.articles && selectedOrder.articles.length > 0 && (
                <div className="border border-gray-200 rounded overflow-hidden bg-white">
                  <div className="p-[10px] flex justify-between items-center border-b border-gray-100">
                    <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Select Article</h3>
                    <span className="text-[10px] text-gray-500">{selectedOrder.articles.length} {selectedOrder.articles.length === 1 ? "article" : "articles"}</span>
                  </div>
                  <div className="p-[10px]">
                    <div className="max-h-[220px] overflow-y-auto pr-1">
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
                        <button
                          type="button"
                          className={`text-center border rounded px-1.5 py-1.5 transition-all ${
                            selectedArticleId === "all" ? "border-purple-300 bg-purple-50 ring-1 ring-purple-200" : "border-gray-200 hover:border-purple-200 hover:bg-gray-50"
                          }`}
                          onClick={() => { setSelectedArticleId("all"); setActiveRequirementId(null); }}
                          title="View all articles"
                        >
                          <i className={`${selectedArticleId === "all" ? "ri-stack-fill" : "ri-stack-line"} text-sm ${selectedArticleId === "all" ? "text-purple-600" : "text-gray-500"}`}></i>
                          <h4 className="text-[10px] font-bold text-gray-900 leading-tight mt-0.5">All</h4>
                          <p className="text-[9px] text-gray-500">{selectedOrder.articles.reduce((sum, a) => sum + (a.plannedQuantity || 0), 0)}</p>
                        </button>
                        {selectedOrder.articles.map((article) => (
                          <button
                            key={article.id}
                            type="button"
                            className={`text-center border rounded px-1.5 py-1.5 transition-all ${
                              selectedArticleId === article.id ? "border-purple-300 bg-purple-50 ring-1 ring-purple-200" : "border-gray-200 hover:border-purple-200 hover:bg-gray-50"
                            }`}
                            onClick={() => { setSelectedArticleId(article.id); setActiveRequirementId(null); }}
                            title={`${article.articleNumber} - Qty: ${article.plannedQuantity}`}
                          >
                            <h4 className="text-[10px] font-bold text-gray-900 truncate leading-tight" title={article.articleNumber}>{article.articleNumber}</h4>
                            <p className="text-[9px] text-gray-500 mt-0.5">{article.plannedQuantity}</p>
                            {article.remarks && <p className="text-[8px] text-gray-400 truncate leading-tight" title={article.remarks}>{article.remarks}</p>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedArticleId && selectedArticleId !== "all" && selectedArticle && (
                <>
                  <div className="border border-purple-200 rounded overflow-hidden bg-purple-50/30">
                    <div className="p-[10px] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                          <i className="ri-article-line text-lg text-purple-600"></i>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">{selectedArticle.articleNumber}</h3>
                          <p className="text-[11px] text-gray-600">Qty: <span className="font-bold text-purple-600">{selectedArticle.plannedQuantity}</span>{selectedOrder.styleCode ? ` • Style: ${selectedOrder.styleCode}` : ""}</p>
                          {selectedArticle.remarks && <p className="text-[10px] text-gray-500 mt-0.5">{selectedArticle.remarks}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-500">BOM Items</div>
                        <div className="text-sm font-bold text-purple-600">{sortedRequirements.length}</div>
                      </div>
                    </div>
                  </div>

                  {productLoading && (
                    <div className="border border-gray-200 rounded overflow-hidden bg-white p-[10px]">
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2 opacity-50"></div>
                        <p className="text-[11px] text-gray-500">Loading yarn requirements...</p>
                      </div>
                    </div>
                  )}

                  {!productLoading && (
                    <div className="border border-gray-200 rounded overflow-hidden bg-white">
                      <div className="p-[10px] flex justify-between items-center border-b border-gray-100">
                        <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">BOM - Yarn Requirements</h3>
                        {sortedRequirements.length > 0 && (
                          <span className="text-[11px] text-gray-500">
                            Total: {formatKgDisplay(sortedRequirements.reduce((sum, req) => sum + req.requiredQty, 0))} • {sortedRequirements.length} yarn{sortedRequirements.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="overflow-x-auto min-h-[120px]">
                        {sortedRequirements.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <i className="ri-stack-line text-4xl text-gray-300 mb-2"></i>
                            <p className="text-[11px] text-gray-500">No yarn requisition in BOM for this article.</p>
                          </div>
                        ) : (
                          <table className="w-full border-collapse border border-gray-200">
                            <thead>
                              <tr className="bg-gray-50/30">
                                <th className="pl-[10px] pr-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                                <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort("yarnName")}><div className="flex items-center gap-1.5">Yarn <SortIcon field="yarnName" /></div></th>
                                <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort("requiredQty")}><div className="flex items-center gap-1.5">Required <SortIcon field="requiredQty" /></div></th>
                                <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort("issuedQty")}><div className="flex items-center gap-1.5">Issued <SortIcon field="issuedQty" /></div></th>
                                <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Remaining</th>
                                <th className="px-1.5 py-2 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort("status")}><div className="flex items-center gap-1.5 justify-end">Status <SortIcon field="status" /></div></th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedRequirements.map((requirement) => {
                                const issuedQty = getIssuedQty(requirement, allYarnTransactions, selectedOrder);
                                const issuedQtyInGrams = issuedQty * 1000;
                                const remaining = Math.max(requirement.requiredQty - issuedQtyInGrams, 0);
                                const status = getRequirementStatus(requirement, allYarnTransactions, selectedOrder);
                                const isActive = activeRequirementId === requirement.id;
                                return (
                                  <tr key={requirement.id} className={`hover:bg-gray-50/50 transition-colors ${isActive ? "bg-purple-50" : ""}`}>
                                    <td className="pl-[10px] pr-1.5 py-2 border border-gray-200">
                                      <div className="flex items-center gap-1.5">
                                        <button type="button" className={`inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${isActive ? "bg-purple-600 text-white" : "border border-purple-200 text-purple-700 hover:bg-purple-50"}`} onClick={() => handleStartIssuing(requirement.id)}>Issue</button>
                                        {status === "Issued" && <span className="text-[11px] text-gray-500 italic">Fully Issued</span>}
                                      </div>
                                    </td>
                                    <td className="px-1.5 py-2 border border-gray-200"><div className="text-[12px] font-bold text-gray-900">{requirement.yarnName}</div><div className="text-[10px] text-gray-500">{requirement.yarnCode} • {requirement.yarnType}</div></td>
                                    <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{formatKgDisplay(requirement.requiredQty)}</td>
                                    <td className="px-1.5 py-2 text-[12px] border border-gray-200"><span className="font-semibold text-blue-600">{formatKgDisplay(issuedQtyInGrams)}</span> <span className="text-[10px] text-gray-500">/ {formatKgDisplay(requirement.requiredQty)}</span></td>
                                    <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{formatKgDisplay(remaining)}</td>
                                    <td className="px-1.5 py-2 text-right pr-[10px] border border-gray-200"><span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${requirementStatusBadge(status)}`}>{status}</span></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                      <div className="p-[10px] border-t border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
                        <p className="text-[11px] text-gray-600">
                          {allBomIssuedForCurrentArticle
                            ? "All yarn issued for this article. You can mark yarn issue as completed."
                            : "Issue all BOM yarns above to enable marking yarn issue completed."}
                        </p>
                        <button
                          type="button"
                          onClick={handleMarkYarnIssueCompleted}
                          disabled={!canMarkYarnIssueCompleted || completingYarnIssue}
                          className="inline-flex items-center gap-2 rounded-lg border border-transparent px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-400 bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                        >
                          {completingYarnIssue ? (
                            <>
                              <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                              Updating…
                            </>
                          ) : (
                            <>
                              <i className="ri-check-double-line text-sm" />
                              Mark yarn issue completed
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedArticleId === "all" && !productLoading && (
                <div className="border border-gray-200 rounded overflow-hidden bg-white">
                  <div className="p-[10px] flex justify-between items-center border-b border-gray-100">
                    <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">BOM - All Articles</h3>
                    {sortedRequirements.length > 0 && (
                      <span className="text-[11px] text-gray-500">
                        Total: {formatKgDisplay(sortedRequirements.reduce((sum, req) => sum + req.requiredQty, 0))} • {sortedRequirements.length} entry{sortedRequirements.length !== 1 ? "ies" : ""}
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto min-h-[120px]">
                    {sortedRequirements.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <i className="ri-stack-line text-4xl text-gray-300 mb-2"></i>
                        <p className="text-[11px] text-gray-500">No yarn requisition in BOM for any article.</p>
                      </div>
                    ) : (
                      <table className="w-full border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50/30">
                            <th className="pl-[10px] pr-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                            <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort("yarnName")}><div className="flex items-center gap-1.5">Yarn <SortIcon field="yarnName" /></div></th>
                            <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort("requiredQty")}><div className="flex items-center gap-1.5">Required <SortIcon field="requiredQty" /></div></th>
                            <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort("issuedQty")}><div className="flex items-center gap-1.5">Issued <SortIcon field="issuedQty" /></div></th>
                            <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Remaining</th>
                            <th className="px-1.5 py-2 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort("status")}><div className="flex items-center gap-1.5 justify-end">Status <SortIcon field="status" /></div></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedRequirements.map((requirement) => {
                            const issuedQty = getIssuedQty(requirement, allYarnTransactions, selectedOrder);
                            const issuedQtyInGrams = issuedQty * 1000;
                            const remaining = Math.max(requirement.requiredQty - issuedQtyInGrams, 0);
                            const status = getRequirementStatus(requirement, allYarnTransactions, selectedOrder);
                            const isActive = activeRequirementId === requirement.id;
                            return (
                              <tr key={requirement.id} className={`hover:bg-gray-50/50 transition-colors ${isActive ? "bg-purple-50" : ""}`}>
                                <td className="pl-[10px] pr-1.5 py-2 border border-gray-200">
                                  <div className="flex items-center gap-1.5">
                                    <button type="button" className={`inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${isActive ? "bg-purple-600 text-white" : "border border-purple-200 text-purple-700 hover:bg-purple-50"}`} onClick={() => handleStartIssuing(requirement.id)}>Issue</button>
                                    {status === "Issued" && <span className="text-[11px] text-gray-500 italic">Fully Issued</span>}
                                  </div>
                                </td>
                                <td className="px-1.5 py-2 border border-gray-200"><div className="text-[12px] font-bold text-gray-900">{requirement.yarnName}</div><div className="text-[10px] text-gray-500">{requirement.yarnCode} • {requirement.yarnType}</div></td>
                                <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{formatKgDisplay(requirement.requiredQty)}</td>
                                <td className="px-1.5 py-2 text-[12px] border border-gray-200"><span className="font-semibold text-blue-600">{formatKgDisplay(issuedQtyInGrams)}</span> <span className="text-[10px] text-gray-500">/ {formatKgDisplay(requirement.requiredQty)}</span></td>
                                <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{formatKgDisplay(remaining)}</td>
                                <td className="px-1.5 py-2 text-right pr-[10px] border border-gray-200"><span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${requirementStatusBadge(status)}`}>{status}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {!selectedArticleId && !productLoading && (
                <div className="border border-gray-200 rounded overflow-hidden bg-white p-[10px]">
                  <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                    <i className="ri-article-line text-4xl text-gray-300 mb-2"></i>
                    <p className="text-[11px]">Select an article above to view and issue yarn requirements.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>

      {/* Scan & Issue Side Panel */}
      {showScanIssuePanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setShowScanIssuePanel(false)}
          />
          {/* Side Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <div className="box h-full flex flex-col">
              <div className="box-header border-b border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h3 className="box-title text-lg">Scan &amp; Issue</h3>
                  <button
                    onClick={() => setShowScanIssuePanel(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close panel"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <div className="box-body flex-1 overflow-y-auto">
                {!activeRequirement ? (
                  <div className="text-center py-12 text-sm text-gray-500">
                    <i className="ri-focus-2-line text-4xl text-gray-300 mb-2"></i>
                    <p>Select a yarn item to start issuing.</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Click "Issue Yarn" button on a requirement to begin.
                    </p>
                  </div>
                ) : activeRequirement ? (
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
                            getRequirementStatus(activeRequirement, allYarnTransactions, selectedOrder ?? { id: "", orderNumber: "" })
                          )}`}
                        >
                          {getRequirementStatus(activeRequirement, allYarnTransactions, selectedOrder ?? { id: "", orderNumber: "" })}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white rounded p-3 border border-gray-100">
                          <p className="text-gray-500">Required</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatKgDisplay(activeRequirement.requiredQty)}
                          </p>
                        </div>
                        <div className="bg-white rounded p-3 border border-gray-100">
                          <p className="text-gray-500">Issued</p>
                          <p className="text-sm font-medium text-blue-600">
                            {formatKgDisplay(getIssuedQty(activeRequirement, allYarnTransactions, selectedOrder ?? { id: "", orderNumber: "" }) * 1000)}
                          </p>
                        </div>
                        <div className="bg-white rounded p-3 border border-gray-100">
                          <p className="text-gray-500">Short-Term Available</p>
                          <p className="text-sm font-medium text-green-600">
                            {formatKgDisplay(activeRequirement.shortTermAvailable)}
                          </p>
                        </div>
                        <div className="bg-white rounded p-3 border border-gray-100">
                          <p className="text-gray-500">Long-Term Available</p>
                          <p className="text-sm font-medium text-orange-600">
                            {formatKgDisplay(activeRequirement.longTermAvailable)}
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
                          disabled={barcodeLoading}
                          autoFocus
                        />
                        <i className="ri-barcode-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      </div>
                      <button
                        type="submit"
                        className="ti-btn ti-btn-primary w-full whitespace-normal break-words leading-tight px-4 py-2 text-sm"
                        disabled={barcodeLoading}
                      >
                        {barcodeLoading ? (
                          <>
                            <span className="animate-spin inline-block mr-2">⟳</span>
                            Loading...
                          </>
                        ) : (
                          "Scan Barcode"
                        )}
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Issue Activity Log Side Panel */}
      {showActivityLogPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setShowActivityLogPanel(false)}
          />
          {/* Side Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <div className="box h-full flex flex-col">
              <div className="box-header border-b border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="box-title text-lg">Issue Activity Log</h3>
                  <button
                    onClick={() => setShowActivityLogPanel(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close panel"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
                
                {/* Date Filters */}
                <div className="space-y-3 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label text-xs font-semibold text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        className="form-control text-sm"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs font-semibold text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        className="form-control text-sm"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || undefined}
                      />
                    </div>
                  </div>
                  {(startDate || endDate) && (
                    <>
                      <button
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="ti-btn ti-btn-outline w-full text-xs py-1.5"
                      >
                        <i className="ri-close-line me-1"></i>
                        Clear Filters
                      </button>
                      {yarnTransactions.length > 0 && (
                        <p className="text-xs text-gray-500 text-center">
                          Showing {yarnTransactions.length} transaction{yarnTransactions.length !== 1 ? "s" : ""} for selected date range
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="box-body flex-1 overflow-y-auto">
                {transactionsLoading ? (
                  <div className="text-center py-12 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>Loading transactions...</p>
                  </div>
                ) : yarnTransactions.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-500">
                    <i className="ri-timeline-line text-4xl text-gray-300 mb-2"></i>
                    <p>
                      {startDate || endDate
                        ? "No transactions found for the selected date range."
                        : "No yarn issued transactions found."}
                    </p>
                    {(startDate || endDate) && (
                      <button
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="ti-btn ti-btn-outline mt-3 text-xs"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {yarnTransactions.map((transaction) => (
                      <div
                        key={transaction._id}
                        className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">
                              {transaction.yarnName}
                            </h4>
                            <p className="text-xs text-gray-500">
                              Order: {transaction.orderno}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {transaction.yarn?.yarnType?.name || "N/A"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                            <p className="text-xs font-mono text-gray-900 break-all">
                              {transaction._id}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Transaction Type</p>
                            <p className="text-xs text-gray-900">
                              {transaction.transactionType}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Transaction Date</p>
                            <p className="text-xs text-gray-900">
                              {new Date(transaction.transactionDate).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Cone Count</p>
                            <p className="text-xs font-semibold text-gray-900">
                              {transaction.transactionConeCount}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Net Weight</p>
                            <p className="text-xs font-semibold text-blue-600">
                              {transaction.transactionNetWeight} kg
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Total Weight</p>
                            <p className="text-xs text-gray-900">
                              {transaction.transactionTotalWeight} kg
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Tear Weight</p>
                            <p className="text-xs text-gray-900">
                              {transaction.transactionTearWeight} kg
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div>
                              <span className="font-medium">Created:</span>{" "}
                              {new Date(transaction.createdAt).toLocaleString()}
                            </div>
                            <div>
                              <span className="font-medium">Updated:</span>{" "}
                              {new Date(transaction.updatedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="box-header border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <h3 className="box-title text-lg">Issue Yarn</h3>
                <button
                  onClick={() => {
                    setShowIssueModal(false);
                    setConeData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="box-body p-6">
              {coneData && (
                <div className="mb-6 p-4 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Cone Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Barcode:</span>
                      <span className="ml-2 font-medium">{coneData.barcode}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Yarn Name:</span>
                      <span className="ml-2 font-medium">{coneData.yarnName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Cone Weight:</span>
                      <span className="ml-2 font-medium">{coneData.coneWeight} kg</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tear Weight:</span>
                      <span className="ml-2 font-medium">{coneData.tearWeight} kg</span>
                    </div>
                    {coneData.boxId && (
                      <div>
                        <span className="text-gray-500">Box ID:</span>
                        <span className="ml-2 font-medium">{coneData.boxId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="form-label text-sm font-semibold text-gray-700">
                    Total Weight (kg) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="form-control flex-1"
                      placeholder="Enter total weight (e.g., 0.05, 1.25, 0.5)"
                      value={transactionForm.totalWeight}
                      onChange={(e) => handleTransactionFormChange("totalWeight", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        setFetchingWeight(true);
                        try {
                          const w = await fetchWeightLatest();
                          if (w != null && w > 0) {
                            setTransactionForm((prev) => {
                              const tear = parseFloat(prev.totalTearWeight) || 0;
                              return {
                                ...prev,
                                totalWeight: w.toFixed(2),
                                totalNetWeight: (w - tear).toFixed(2),
                              };
                            });
                            toast.success(`Weight from scale: ${w.toFixed(2)} kg`);
                          } else {
                            toast.error("Could not get weight from scale.");
                          }
                        } finally {
                          setFetchingWeight(false);
                        }
                      }}
                      className="ti-btn ti-btn-outline-primary whitespace-nowrap"
                      disabled={fetchingWeight}
                      title="Get weight from connected scale"
                    >
                      {fetchingWeight ? "…" : "From scale"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label text-sm font-semibold text-gray-700">
                    Number of Cones <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter number of cones (e.g., 1, 2, 5)"
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
                    className="form-control"
                    placeholder="Enter tear weight (e.g., 0.05, 1.25, 0.5)"
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
                    className="form-control bg-gray-50"
                    placeholder="Auto-calculated"
                    value={transactionForm.totalNetWeight}
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Calculated as: Total Weight - Total Tear Weight
                  </p>
                </div>

                {activeRequirement && selectedOrder && (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Yarn:</span> {activeRequirement.yarnName}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold">Order:</span> {selectedOrder.orderNumber}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold">Required:</span> {formatKgDisplay(activeRequirement.requiredQty)} |{" "}
                      <span className="font-semibold">Issued:</span> {formatKgDisplay(getIssuedQty(activeRequirement, allYarnTransactions, selectedOrder) * 1000)} |{" "}
                      <span className="font-semibold">Remaining:</span>{" "}
                      {formatKgDisplay(Math.max(activeRequirement.requiredQty - (getIssuedQty(activeRequirement, allYarnTransactions, selectedOrder) * 1000), 0))}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowIssueModal(false);
                    setConeData(null);
                  }}
                  className="ti-btn ti-btn-outline"
                  disabled={submittingTransaction}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleIssueSubmit}
                  className="ti-btn ti-btn-primary"
                  disabled={submittingTransaction}
                >
                  {submittingTransaction ? (
                    <>
                      <span className="animate-spin inline-block mr-2">⟳</span>
                      Processing...
                    </>
                  ) : (
                    "Issue Yarn"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YarnIssuePage;
