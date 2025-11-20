"use client";
import React, { useMemo, useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";

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
  // If BOM is empty, order is not issued yet
  if (!order.bom || order.bom.length === 0) {
    return "Not Issued";
  }
  
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

const YarnIssuePage = () => {
  const { hasSubPermission, isLoading } = useNavigation();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
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

  const hasPermission = hasSubPermission("/yarn-management", "Yarn Issue");

  // Fetch production orders
  useEffect(() => {
    const fetchOrders = async () => {
      console.log("Fetching orders from API...");
      setOrdersLoading(true);
      try {
        const token = getAccessToken();
        const response = await fetch(
          `${API_BASE_URL}/production/orders?page=1&limit=10&sortBy=createdAt&populate=articles`,
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

        // Transform API orders to match our interface
        // Preserve existing BOM data if orders are being refetched
        setOrders((prevOrders) => {
          const transformedOrders: ProductionOrder[] = apiOrders.map((order) => {
            // Find existing order to preserve BOM and styleCode
            const existingOrder = prevOrders.find((o) => o.id === order.id);
            
            return {
              id: order.id,
              orderNumber: order.orderNumber,
              buyer: order.orderNote || "N/A",
              floor: order.currentFloor || "N/A",
              styleCode: existingOrder?.styleCode || "",
              scheduledDate: order.createdAt || new Date().toISOString(),
              notes: order.orderNote,
              bom: existingOrder?.bom || [], // Preserve existing BOM
              articles: order.articles || [],
            };
          });
          
          return transformedOrders;
        });
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("Failed to load production orders");
      } finally {
        setOrdersLoading(false);
      }
    };

    if (hasPermission) {
      fetchOrders();
    }
  }, [hasPermission]);

  // Fetch product details when article is selected
  useEffect(() => {
    const fetchProductAndUpdateBOM = async () => {
      if (!selectedOrderId || !selectedArticleId) {
        return;
      }

      // Get article number from current orders state
      const selectedOrder = orders.find((o) => o.id === selectedOrderId);
      if (!selectedOrder || !selectedOrder.articles) {
        return;
      }

      const selectedArticle = selectedOrder.articles.find((a) => a.id === selectedArticleId);
      if (!selectedArticle) {
        return;
      }

      const articleNumber = selectedArticle.articleNumber;

      setProductLoading(true);
      try {
        const token = getAccessToken();
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
            // The API returns a single product object directly, not wrapped in results
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

        // Strategy 2: If not found, try direct fetch (assuming articleNumber might be product ID)
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
              // Verify it has BOM
              if (directProduct.bom && directProduct.bom.length > 0) {
                product = directProduct;
              }
            }
          } catch (error) {
            console.warn("Direct product fetch failed:", error);
          }
        }

        if (!product) {
          console.error("Product not found for article:", articleNumber);
          toast.error(`Product not found for article ${articleNumber}`);
          setProductLoading(false);
          return;
        }

        if (!product.bom || !Array.isArray(product.bom) || product.bom.length === 0) {
          console.error("Product found but no BOM:", product);
          toast.error(`No BOM found for article ${articleNumber}`);
          setProductLoading(false);
          return;
        }

        // Get article planned quantity for calculation
        const articlePlannedQty = selectedArticle.plannedQuantity || 1;

        // Map product BOM to yarn requirements
        // BOM quantity is in grams per unit, so multiply by article planned quantity
        console.log("Processing BOM, product.bom:", product.bom);
        const yarnRequirements: YarnRequirement[] = product.bom.map((bomItem, index) => {
          // Handle yarnCatalogId - can be string or populated object
          let yarnCode = `YARN-${index}`;
          let yarnType = "Unknown";
          
          if (typeof bomItem.yarnCatalogId === "string") {
            yarnCode = bomItem.yarnCatalogId;
          } else if (bomItem.yarnCatalogId && typeof bomItem.yarnCatalogId === "object") {
            yarnCode = bomItem.yarnCatalogId.id || yarnCode;
            // Get yarn type from populated object if available
            if (bomItem.yarnCatalogId.yarnType?.name) {
              yarnType = bomItem.yarnCatalogId.yarnType.name;
            }
          }

          // If yarn type not found from populated object, extract from yarnName
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

          // Calculate required quantity: BOM quantity (grams per unit) * article planned quantity
          // Convert grams to kg for display (divide by 1000)
          const requiredQtyInGrams = bomItem.quantity * articlePlannedQty;
          const requiredQtyInKg = requiredQtyInGrams / 1000;

          return {
            id: `req-${bomItem._id}-${index}`,
            yarnCode: yarnCode,
            yarnName: bomItem.yarnName || "Unknown Yarn",
            yarnType: yarnType,
            requiredQty: requiredQtyInKg, // Store in kg
            tolerancePercent: ISSUE_TOLERANCE_DEFAULT,
            shortTermAvailable: 0, // Keep for internal use but won't display
            longTermAvailable: 0, // Keep for internal use but won't display
            logs: [],
          };
        });

        console.log("Yarn requirements created:", yarnRequirements);

        // Update the order with BOM
        console.log("Updating order with BOM, selectedOrderId:", selectedOrderId, "yarnRequirements:", yarnRequirements);
        
        // Use functional update to ensure we have the latest state
        setOrders((prev) => {
          // Find the current order to preserve any existing data
          const currentOrder = prev.find((o) => o.id === selectedOrderId);
          if (!currentOrder) {
            console.warn("Order not found in state:", selectedOrderId);
            return prev;
          }

          const updated = prev.map((order) => {
            if (order.id !== selectedOrderId) {
              return order;
            }
            
            // Always use the new yarnRequirements for the selected article
            const updatedOrder = {
              ...order,
              styleCode: product?.styleCode || articleNumber,
              bom: yarnRequirements, // Use the newly created yarn requirements
            };
            console.log("Updated order:", updatedOrder, "BOM length:", updatedOrder.bom.length);
            return updatedOrder;
          });
          
          // Verify the update
          const verifyOrder = updated.find((o) => o.id === selectedOrderId);
          console.log("Verification - Order in updated array:", {
            id: verifyOrder?.id,
            bomLength: verifyOrder?.bom?.length || 0,
            bom: verifyOrder?.bom,
          });
          
          console.log("All orders after update:", updated);
          return updated;
        });

        // Auto-select first requirement
        if (yarnRequirements.length > 0) {
          setActiveRequirementId(yarnRequirements[0].id);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error(`Failed to load product details for article ${articleNumber}`);
      } finally {
        setProductLoading(false);
      }
    };

    fetchProductAndUpdateBOM();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderId, selectedArticleId]);

  // Debug: Track when orders change
  useEffect(() => {
    console.log("Orders state changed, total orders:", orders.length);
    const selectedOrderInState = orders.find((o) => o.id === selectedOrderId);
    if (selectedOrderInState) {
      console.log("Selected order in orders state:", {
        id: selectedOrderInState.id,
        bomLength: selectedOrderInState.bom?.length || 0,
        bom: selectedOrderInState.bom,
      });
    }
  }, [orders, selectedOrderId]);

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
        (order.buyer && order.buyer.toLowerCase().includes(query)) ||
        (order.floor && order.floor.toLowerCase().includes(query)) ||
        (order.styleCode && order.styleCode.toLowerCase().includes(query))
      );
    });
  }, [orders, searchTerm]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId(null);
      setSelectedArticleId(null);
      return;
    }

    if (!selectedOrderId || !filteredOrders.some((order) => order.id === selectedOrderId)) {
      const firstOrder = filteredOrders[0];
      setSelectedOrderId(firstOrder.id);
      // Auto-select first article if available
      if (firstOrder.articles && firstOrder.articles.length > 0) {
        setSelectedArticleId(firstOrder.articles[0].id);
      }
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder = useMemo(
    () => filteredOrders.find((order) => order.id === selectedOrderId) ?? null,
    [filteredOrders, selectedOrderId]
  );

  // Debug: Log when selectedOrder changes
  useEffect(() => {
    console.log("selectedOrder changed:", selectedOrder);
    if (selectedOrder) {
      console.log("selectedOrder.bom:", selectedOrder.bom, "length:", selectedOrder.bom?.length);
    }
  }, [selectedOrder]);

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
      console.log("sortedRequirements: no selectedOrder");
      return [];
    }

    console.log("sortedRequirements: selectedOrder.bom =", selectedOrder.bom, "length =", selectedOrder.bom?.length);
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

    console.log("sortedRequirements: returning", data.length, "items");
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
  };

  const handleStartIssuing = (requirementId: string) => {
    setActiveRequirementId(requirementId);
    resetScanState();
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

    // Check if we're exceeding the required quantity
    const currentIssued = getIssuedQty(activeRequirement);
    const maxAllowed = activeRequirement.requiredQty * (1 + activeRequirement.tolerancePercent);
    if (currentIssued + totalNetWeight > maxAllowed + 0.0001) {
      toast.error(
        `Cannot issue more than ${formatKg(maxAllowed)} for ${activeRequirement.yarnName}.`
      );
      return;
    }

    setSubmittingTransaction(true);
    try {
      const token = getAccessToken();
      const transactionDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      const transactionData = {
        yarn: yarnCatalogId,
        yarnName: activeRequirement.yarnName,
        transactionType: "yarn_issued",
        transactionDate: transactionDate,
        totalWeight: totalWeight,
        totalTearWeight: totalTearWeight,
        totalNetWeight: totalNetWeight,
        numberOfCones: numberOfCones,
        orderno: selectedOrder.orderNumber,
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

      // Create log entry for local state
      const newLog: IssueLog = {
        id: crypto.randomUUID(),
        issueDate: new Date().toISOString(),
        coneBarcode: barcodeInput.trim(),
        weightIssued: totalNetWeight,
        issuedBy: "System User",
      };

      // Update local state
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
                logs: [...requirement.logs, newLog],
              };
            }),
          };
        })
      );

      const updatedTotal = currentIssued + totalNetWeight;
      const statusAfterIssue = updatedTotal + 0.0001 >= activeRequirement.requiredQty ? "Issued" : "Partially Issued";

      toast.success(
        `${formatKg(totalNetWeight)} issued successfully. Status: ${statusAfterIssue}.`
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

  // Show loading state while permissions are being loaded
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
                      {selectedOrder.buyer} • {selectedOrder.styleCode || "Select article"}
                    </p>
                  </div>
                  <div className="text-end text-sm text-gray-500">
                    <div className="flex items-center gap-2 justify-end">
                      <i className="ri-store-3-line"></i>
                      {selectedOrder.floor}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <i className="ri-calendar-check-line"></i>
                      Created:{" "}
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

              {/* Articles Selection */}
              {selectedOrder.articles && selectedOrder.articles.length > 0 && (
                <div className="box">
                  <div className="box-header">
                    <h3 className="box-title">Select Article</h3>
                  </div>
                  <div className="box-body">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedOrder.articles.map((article) => (
                        <button
                          key={article.id}
                          className={`text-left border rounded-md px-4 py-3 transition ${
                            selectedArticleId === article.id
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-gray-200 hover:border-primary/60"
                          }`}
                          onClick={() => {
                            setSelectedArticleId(article.id);
                            setActiveRequirementId(null);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">
                                {article.articleNumber}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                Qty: {article.plannedQuantity}
                              </p>
                              {article.remarks && (
                                <p className="text-xs text-gray-400 mt-1">{article.remarks}</p>
                              )}
                            </div>
                            <span
                              className={`inline-flex px-2 py-1 text-[10px] font-semibold rounded-full ${
                                article.status === "In Progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : article.status === "Completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {article.status}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Loading state for product BOM */}
              {productLoading && (
                <div className="box">
                  <div className="box-body text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading yarn requirements...</p>
                  </div>
                </div>
              )}

              {!productLoading && (
                <div className="box">
                  <div className="box-header flex justify-between items-center">
                    <h3 className="box-title">Bill of Material Yarn Requirements</h3>
                    <span className="text-xs text-gray-500">
                      {selectedOrder.bom.length} yarn types
                    </span>
                  </div>
                  <div className="box-body">
                    {!selectedArticle ? (
                      <div className="text-center py-12 text-gray-500">
                        <i className="ri-article-line text-4xl text-gray-400 mb-2"></i>
                        <p>Select an article to view yarn requirements.</p>
                      </div>
                    ) : sortedRequirements.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <i className="ri-stack-line text-4xl text-gray-400 mb-2"></i>
                        <p>No yarn requisition configured in BOM for this article.</p>
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
              )}

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
                              disabled={barcodeLoading}
                            />
                            <i className="ri-barcode-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                          </div>
                          <button
                            type="submit"
                            className="ti-btn ti-btn-primary w-full sm:w-auto whitespace-normal break-words leading-tight px-4 py-2 text-sm"
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

                {activeRequirement && (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Yarn:</span> {activeRequirement.yarnName}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold">Order:</span> {selectedOrder?.orderNumber}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold">Required:</span> {formatKg(activeRequirement.requiredQty)} |{" "}
                      <span className="font-semibold">Issued:</span> {formatKg(getIssuedQty(activeRequirement))} |{" "}
                      <span className="font-semibold">Remaining:</span>{" "}
                      {formatKg(Math.max(activeRequirement.requiredQty - getIssuedQty(activeRequirement), 0))}
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
