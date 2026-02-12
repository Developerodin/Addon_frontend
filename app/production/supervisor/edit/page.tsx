"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { productionService, ProductionOrder, UpdateOrderRequest } from "@/shared/services/productionService";
import {
  getMachineActiveNeedleMap,
  listMachineOrderAssignments,
  getAssignmentByMachineId,
  updateMachineOrderAssignment,
  OrderStatus,
  type MachineOrderAssignment,
} from "@/shared/services/machineOrderAssignmentService";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import NumericInput from "@/shared/utils/numericInput";
import axios from "axios";
import yarnCatalogService, { YarnCatalog } from "@/shared/services/yarnCatalogService";

interface Article {
  id: string;
  articleNumber: string;
  plannedQuantity: number;
  linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  machineId?: string;
  /** Queue position (1, 2, 3...) for this article on the selected machine */
  queuePriority?: number;
  remarks?: string;
  productId?: string;
  /** Needle size from product's Needles attribute (for filtering machines) */
  needleSizeFromProduct?: string;
  bom?: ProductBOM[];
}

interface Product {
  id: string;
  name: string;
  factoryCode: string;
  attributes?: Record<string, string | number>;
  bom?: ProductBOM[];
}

interface ProductBOM {
  yarnCatalogId?: string;
  materialId?: string;
  quantity: number;
  yarnName?: string;
  materialName?: string;
}

interface YarnCatalogMap {
  [key: string]: YarnCatalog;
}

interface Machine {
  _id?: string;
  id?: string;
  machineCode: string;
  machineNumber: string;
  model: string;
  floor: string;
  status: 'Active' | 'Under Maintenance' | 'Idle';
  needleSizeConfig?: { needleSize: string }[];
  needleSize?: string;
}

interface EditOrderFormData {
  orderPriority: 'High' | 'Medium' | 'Low' | 'Urgent';
  articles: Article[];
  orderNote?: string;
}

const EditOrderContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('id') ?? null;
  
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [formData, setFormData] = useState<EditOrderFormData>({
    orderPriority: 'Medium',
    articles: [],
    orderNote: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoadingMachines, setIsLoadingMachines] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [yarnCatalogs, setYarnCatalogs] = useState<YarnCatalogMap>({});
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [machineModalArticleIndex, setMachineModalArticleIndex] = useState<number | null>(null);
  const [machineSearchQuery, setMachineSearchQuery] = useState('');
  const [machineActiveNeedleMap, setMachineActiveNeedleMap] = useState<Map<string, string>>(new Map());
  const [needlesValueIdToName, setNeedlesValueIdToName] = useState<Record<string, string>>({});
  /** Machine ID -> assignment (for modal: PO count, article numbers; and for submit sync) */
  const [assignmentsByMachineId, setAssignmentsByMachineId] = useState<Map<string, MachineOrderAssignment>>(new Map());

  // Load order data and machines
  useEffect(() => {
    if (orderId) {
      loadOrderAndMachines();
    } else {
      toast.error('Order ID is required');
      router.push('/production/supervisor');
    }
  }, [orderId]);

  // Fetch assignments (machine -> assignment with productionOrderItems for modal + submit sync). Returns map so loadOrder can use it for queuePriority.
  const fetchAssignments = async (): Promise<Map<string, MachineOrderAssignment>> => {
    try {
      const data = await listMachineOrderAssignments({ page: 1, limit: 500, isActive: true });
      const map = new Map<string, MachineOrderAssignment>();
      data.results.forEach((a) => {
        const mid = typeof a.machine === "object" && a.machine
          ? (a.machine as { id?: string }).id ?? (a.machine as { _id?: string })._id
          : a.machine;
        if (mid) map.set(String(mid), a);
      });
      setAssignmentsByMachineId(map);
      return map;
    } catch {
      setAssignmentsByMachineId(new Map());
      return new Map();
    }
  };

  //  Load both order and machines together
  const loadOrderAndMachines = async () => {
    if (!orderId) return;
    
    setIsLoading(true);
    try {
      const [_, __, assignmentsMap] = await Promise.all([
        fetchMachines(),
        fetchYarnCatalogs(),
        fetchAssignments(),
      ]);
      await loadOrder(assignmentsMap);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
      router.push('/production/supervisor');
    } finally {
      setIsLoading(false);
    }
  };

  // Valid production floors (API may return e.g. "knitting Floor" – match case-insensitively)
  const validProductionFloors = [
    'Knitting', 'Linking', 'Checking', 'Washing', 'Boarding', 
    'Silicon', 'Secondary Checking', 'Branding', 'Final Checking', 
    'Warehouse', 'Dispatch'
  ];
  const floorMatches = (floor: string) =>
    validProductionFloors.some((f) => floor?.toLowerCase().includes(f.toLowerCase()));

  // Fetch machines: only those with valid floor AND active needle in needle configuration
  const fetchMachines = async () => {
    try {
      setIsLoadingMachines(true);
      let activeMap = new Map<string, string>();
      try {
        activeMap = await getMachineActiveNeedleMap();
        setMachineActiveNeedleMap(activeMap);
      } catch {
        setMachineActiveNeedleMap(new Map());
      }

      const response = await fetch(`${API_BASE_URL}/machines?page=1&limit=1000`, {
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch machines');
      const data = await response.json();
      const machinesArray = Array.isArray(data.results) ? data.results : [];
      const validMachines = machinesArray.filter((machine: Machine) => {
        const id = machine._id ?? machine.id;
        if (!id || !floorMatches(machine.floor)) return false;
        return activeMap.has(String(id));
      });
      setMachines(validMachines);
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast.error('Failed to load machines');
    } finally {
      setIsLoadingMachines(false);
    }
  };

  // Fetch Needles attribute option values (for resolving product's Needles when filtering machines)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/product-attributes?page=1&limit=500`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const results = data.results || [];
        const needlesAttr = results.find((a: { name: string }) => a.name?.toLowerCase() === 'needles');
        const map: Record<string, string> = {};
        (needlesAttr?.optionValues || []).forEach((v: { id?: number; _id?: string; name?: string }) => {
          const name = v.name;
          if (!name) return;
          if (v.id != null) map[String(v.id)] = name;
          if (v._id) map[String(v._id)] = name;
        });
        if (!cancelled) setNeedlesValueIdToName(map);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch yarn catalogs for BOM display
  const fetchYarnCatalogs = async () => {
    try {
      let allYarns: YarnCatalog[] = [];
      let currentPage = 1;
      let hasMore = true;

      // Fetch all yarn catalogs in batches
      while (hasMore) {
        const response = await yarnCatalogService.getYarnCatalogs({
          page: currentPage,
          limit: 100,
          status: 'active'
        });
        
        if (response.results && response.results.length > 0) {
          allYarns = [...allYarns, ...response.results];
          currentPage++;
          hasMore = currentPage <= (response.totalPages || 1);
        } else {
          hasMore = false;
        }
      }

      // Create a map for quick lookup
      const yarnMap: YarnCatalogMap = {};
      allYarns.forEach((yarn) => {
        yarnMap[yarn.id] = yarn;
      });
      setYarnCatalogs(yarnMap);
    } catch (error) {
      console.error('Error fetching yarn catalogs:', error);
    }
  };

  // Fetch products for modal
  const fetchProducts = async (search: string = '') => {
    try {
      setIsLoadingProducts(true);
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await axios.get(`${API_BASE_URL}/products?page=1&limit=1000${searchParam}`);
      const productsData = response.data.results || [];
      // Filter to only show products with factory codes
      const productsWithFactoryCode = productsData.filter((p: Product) => p.factoryCode && p.factoryCode.trim() !== '');
      setProducts(productsWithFactoryCode);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Open product selection modal
  const openProductModal = (articleIndex: number) => {
    setSelectedArticleIndex(articleIndex);
    setShowProductModal(true);
    setProductSearchQuery('');
    fetchProducts();
  };

  // Close modal
  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedArticleIndex(null);
    setProductSearchQuery('');
  };

  // Select product and update article
  const selectProduct = async (product: Product) => {
    if (selectedArticleIndex === null) return;

    try {
      // Fetch full product details with BOM
      const productResponse = await axios.get(`${API_BASE_URL}/products/${product.id}`);
      const fullProduct = productResponse.data;

      // Normalize BOM structure - handle both yarnCatalogId and materialId formats
      const normalizedBOM = await Promise.all((fullProduct.bom || []).map(async (bomItem: any) => {
        // Handle different BOM formats from backend
        let yarnCatalogId = bomItem.yarnCatalogId || bomItem.materialId || '';
        let yarnName = bomItem.yarnName || bomItem.materialName || '';
        
        // Extract ID if it's an object
        if (typeof yarnCatalogId === 'object' && yarnCatalogId !== null) {
          yarnCatalogId = yarnCatalogId.id || yarnCatalogId._id || '';
        }
        
        // If yarn name is missing, try to get it from yarn catalogs map or fetch it
        if (!yarnName && yarnCatalogId) {
          // First try from already loaded yarn catalogs
          if (yarnCatalogs[yarnCatalogId]) {
            yarnName = yarnCatalogs[yarnCatalogId].yarnName;
          } else {
            // Fetch the specific yarn catalog if not in cache
            try {
              const yarnResponse = await yarnCatalogService.getYarnCatalogById(yarnCatalogId);
              if (yarnResponse) {
                yarnName = yarnResponse.yarnName;
                // Cache it for future use
                setYarnCatalogs(prev => ({ ...prev, [yarnCatalogId]: yarnResponse }));
              }
            } catch (error) {
              console.warn(`Failed to fetch yarn catalog ${yarnCatalogId}:`, error);
            }
          }
        }
        
        return {
          yarnCatalogId,
          quantity: bomItem.quantity || 0,
          yarnName: yarnName || 'Unknown Yarn'
        };
      }));

      const attrs = fullProduct.attributes || {};
      const needlesRaw = attrs.Needles ?? attrs.needles;
      const needleSizeFromProduct =
        needlesRaw != null && needlesRaw !== ''
          ? needlesValueIdToName[String(needlesRaw)] ?? String(needlesRaw)
          : undefined;

      setFormData(prev => ({
        ...prev,
        articles: prev.articles.map((article, index) => 
          index === selectedArticleIndex 
            ? { 
                ...article, 
                articleNumber: product.factoryCode,
                productId: product.id,
                needleSizeFromProduct,
                bom: normalizedBOM
              }
            : article
        )
      }));

      closeProductModal();
      toast.success(`Factory code ${product.factoryCode} selected`);
    } catch (error) {
      console.error('Error fetching product details:', error);
      const attrs = (product as Product).attributes || {};
      const needlesRaw = attrs.Needles ?? attrs.needles;
      const needleSizeFromProduct =
        needlesRaw != null && needlesRaw !== ''
          ? needlesValueIdToName[String(needlesRaw)] ?? String(needlesRaw)
          : undefined;
      setFormData(prev => ({
        ...prev,
        articles: prev.articles.map((article, index) => 
          index === selectedArticleIndex 
            ? { 
                ...article, 
                articleNumber: product.factoryCode,
                productId: product.id,
                needleSizeFromProduct
              }
            : article
        )
      }));
      closeProductModal();
      toast.success(`Factory code ${product.factoryCode} selected`);
    }
  };

  const loadOrder = async (assignmentsMap?: Map<string, MachineOrderAssignment>) => {
    if (!orderId) return;
    
    try {
      const response = await productionService.getOrder(orderId);
      
      if (response.success) {
        const orderData = response.data;
        setOrder(orderData);
        const map = assignmentsMap ?? assignmentsByMachineId;

        let needlesMap: Record<string, string> = {};
        try {
          const attrRes = await fetch(`${API_BASE_URL}/product-attributes?page=1&limit=500`, { headers: { Accept: 'application/json' } });
          if (attrRes.ok) {
            const attrData = await attrRes.json();
            const results = attrData.results || [];
            const needlesAttr = results.find((a: { name: string }) => a.name?.toLowerCase() === 'needles');
            (needlesAttr?.optionValues || []).forEach((v: { id?: number; _id?: string; name?: string }) => {
              if (v.name) {
                if (v.id != null) needlesMap[String(v.id)] = v.name;
                if (v._id) needlesMap[String(v._id)] = v.name;
              }
            });
          }
        } catch {
          // ignore
        }

        // Resolve queue priority from machine-order-assignment for this order/article/machine
        const getQueuePriority = (articleId: string, machineId: string): number | undefined => {
          if (!machineId || !map.size) return undefined;
          const assn = map.get(String(machineId));
          const items = assn?.productionOrderItems ?? [];
          const item = items.find(
            (i) => String(i.productionOrder) === String(orderId) && String(i.article) === String(articleId)
          );
          return item?.priority != null && item.priority >= 1 ? item.priority : undefined;
        };

        const articlesWithBOM = await Promise.all(orderData.articles.map(async (article: any) => {
          const articleId = article.id ?? article._id;
          const machineId = typeof article.machineId === "object" && article.machineId ? article.machineId.id || article.machineId._id : article.machineId || "";
          const queuePriority = getQueuePriority(articleId, machineId);

          try {
            const productResponse = await axios.get(`${API_BASE_URL}/products?page=1&limit=1000&search=${encodeURIComponent(article.articleNumber)}`);
            const products = productResponse.data.results || [];
            const matchingProduct = products.find((p: Product) => p.factoryCode === article.articleNumber);
            
            if (matchingProduct) {
              const fullProductResponse = await axios.get(`${API_BASE_URL}/products/${matchingProduct.id}`);
              const fullProduct = fullProductResponse.data?.data ?? fullProductResponse.data;
              
              // Normalize BOM structure
              const normalizedBOM = await Promise.all((fullProduct.bom || []).map(async (bomItem: any) => {
                let yarnCatalogId = bomItem.yarnCatalogId || bomItem.materialId || '';
                let yarnName = bomItem.yarnName || bomItem.materialName || '';
                
                if (typeof yarnCatalogId === 'object' && yarnCatalogId !== null) {
                  yarnCatalogId = yarnCatalogId.id || yarnCatalogId._id || '';
                }
                
                if (!yarnName && yarnCatalogId) {
                  if (yarnCatalogs[yarnCatalogId]) {
                    yarnName = yarnCatalogs[yarnCatalogId].yarnName;
                  } else {
                    try {
                      const yarnResponse = await yarnCatalogService.getYarnCatalogById(yarnCatalogId);
                      if (yarnResponse) {
                        yarnName = yarnResponse.yarnName;
                        setYarnCatalogs(prev => ({ ...prev, [yarnCatalogId]: yarnResponse }));
                      }
                    } catch (error) {
                      console.warn(`Failed to fetch yarn catalog ${yarnCatalogId}:`, error);
                    }
                  }
                }
                
                return {
                  yarnCatalogId,
                  quantity: bomItem.quantity || 0,
                  yarnName: yarnName || 'Unknown Yarn'
                };
              }));

              const attrs = fullProduct.attributes || {};
              const needlesRaw = attrs.Needles ?? attrs.needles;
              const needleSizeFromProduct =
                needlesRaw != null && needlesRaw !== ''
                  ? needlesMap[String(needlesRaw)] ?? String(needlesRaw)
                  : undefined;

              return {
                id: article._id ?? article.id,
                articleNumber: article.articleNumber,
                plannedQuantity: article.plannedQuantity,
                linkingType: article.linkingType,
                priority: article.priority,
                machineId,
                queuePriority,
                remarks: article.remarks || '',
                productId: matchingProduct.id,
                needleSizeFromProduct,
                bom: normalizedBOM
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch BOM for article ${article.articleNumber}:`, error);
          }
          
          return {
            id: article._id ?? article.id,
            articleNumber: article.articleNumber,
            plannedQuantity: article.plannedQuantity,
            linkingType: article.linkingType,
            priority: article.priority,
            machineId,
            queuePriority,
            remarks: article.remarks || ''
          };
        }));

        setFormData({
          orderPriority: orderData.priority,
          articles: articlesWithBOM,
          orderNote: orderData.orderNote || ''
        });
      } else {
        console.error('Failed to load order:', response.error);
        toast.error('Failed to load order');
        router.push('/production/supervisor');
      }
    } catch (error: any) {
      console.error('Error loading order:', error);
      throw error; // Re-throw to be handled by parent function
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    formData.articles.forEach((article, index) => {
      const artNum = (article.articleNumber || '').toString().trim();
      if (!artNum) {
        newErrors[`article_${index}_articleNumber`] = 'Article # required';
      }
      if (article.plannedQuantity <= 0) {
        newErrors[`article_${index}_quantity`] = 'Qty must be > 0';
      } else if (article.plannedQuantity > 100000) {
        newErrors[`article_${index}_quantity`] = 'Qty cannot exceed 100,000';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof EditOrderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleArticleChange = (articleIndex: number, field: keyof Article, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      articles: prev.articles.map((article, index) => {
        if (index === articleIndex) {
          const updatedArticle = { ...article, [field]: value };
          // If article number is manually changed, clear product association
          if (field === 'articleNumber' && typeof value === 'string') {
            updatedArticle.productId = undefined;
            updatedArticle.needleSizeFromProduct = undefined;
            updatedArticle.bom = undefined;
          }
          return updatedArticle;
        }
        return article;
      })
    }));

    if (field === 'articleNumber') {
      const key = `article_${articleIndex}_articleNumber`;
      if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    } else if (field === 'plannedQuantity') {
      const key = `article_${articleIndex}_quantity`;
      if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  };

  // Calculate total BOM requirements across all articles
  const calculateTotalBOM = () => {
    const bomTotals: Record<string, { yarnName: string; totalGrams: number; totalKg: number }> = {};

    formData.articles.forEach(article => {
      if (article.bom && article.plannedQuantity > 0) {
        article.bom.forEach(bomItem => {
          // Use yarnCatalogId if available, otherwise fall back to materialId for backward compatibility
          const yarnCatalogId = bomItem.yarnCatalogId || bomItem.materialId || '';
          const yarn = yarnCatalogId ? yarnCatalogs[yarnCatalogId] : null;
          const yarnName = bomItem.yarnName || bomItem.materialName || yarn?.yarnName || 'Unknown Yarn';
          
          // Quantity per unit (in grams) * article quantity
          const totalGrams = (bomItem.quantity || 0) * article.plannedQuantity;
          
          // Use yarnCatalogId as key, or materialId if yarnCatalogId is not available
          const key = yarnCatalogId || bomItem.materialId || '';
          
          if (!bomTotals[key]) {
            bomTotals[key] = {
              yarnName,
              totalGrams: 0,
              totalKg: 0
            };
          }
          
          bomTotals[key].totalGrams += totalGrams;
          bomTotals[key].totalKg = bomTotals[key].totalGrams / 1000;
        });
      }
    });

    return Object.entries(bomTotals).map(([yarnCatalogId, data]) => ({
      yarnCatalogId,
      ...data
    }));
  };

  const addArticle = () => {
    const newArticle: Article = {
      id: String(Date.now()),
      articleNumber: '',
      plannedQuantity: 0,
      linkingType: 'Auto Linking',
      priority: 'Medium',
      machineId: '',
      queuePriority: undefined,
      remarks: ''
    };

    setFormData(prev => ({
      ...prev,
      articles: [...prev.articles, newArticle]
    }));
  };

  const removeArticle = (articleId: string) => {
    if (formData.articles.length > 1) {
      setFormData(prev => ({
        ...prev,
        articles: prev.articles.filter(article => article.id !== articleId)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    if (!orderId) {
      toast.error('Order ID is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const updateData: UpdateOrderRequest = {
        priority: formData.orderPriority,
        orderNote: formData.orderNote || undefined,
        articles: formData.articles.map(article => ({
          ...(article.id && !article.id.match(/^\d+$/) && { _id: article.id }),
          articleNumber: article.articleNumber,
          plannedQuantity: article.plannedQuantity,
          linkingType: article.linkingType,
          priority: article.priority,
          machineId: article.machineId || undefined,
          remarks: article.remarks
        }))
      };

      const response = await productionService.updateOrder(orderId, updateData);
      
      if (response.success) {
        // Sync machine-order-assignments: update/add/remove this order's items per machine
        const currentMachineIds = new Set(formData.articles.map((a) => a.machineId).filter(Boolean) as string[]);
        const previousMachineIds = new Set<string>();
        assignmentsByMachineId.forEach((assn, mid) => {
          const hasThisOrder = (assn.productionOrderItems ?? []).some((i) => String(i.productionOrder) === String(orderId));
          if (hasThisOrder) previousMachineIds.add(mid);
        });

        let syncErrors = 0;
        // Remove this order from machines that no longer have any article on them
        for (const mid of Array.from(previousMachineIds)) {
          if (currentMachineIds.has(mid)) continue;
          const assn = assignmentsByMachineId.get(mid);
          if (!assn?.id) continue;
          const itemsWithoutThisOrder = (assn.productionOrderItems ?? []).filter((i) => String(i.productionOrder) !== String(orderId));
          try {
            await updateMachineOrderAssignment(assn.id, { productionOrderItems: itemsWithoutThisOrder });
          } catch (e) {
            syncErrors++;
            console.warn("Failed to remove order from assignment", mid, e);
          }
        }
        // Add/update this order's articles on each selected machine
        for (const mid of Array.from(currentMachineIds)) {
          const assn = await getAssignmentByMachineId(mid).catch(() => null);
          if (!assn?.id) {
            syncErrors++;
            toast.error(`No active needle assignment for machine. Order updated but machine link skipped.`);
            continue;
          }
          const currentItems = assn.productionOrderItems ?? [];
          const itemsWithoutThisOrder = currentItems.filter((i) => String(i.productionOrder) !== String(orderId));
          const newItems = formData.articles
            .filter((a) => a.machineId === mid)
            .map((a, i) => ({
              productionOrder: orderId!,
              article: a.id,
              priority: a.queuePriority != null && a.queuePriority >= 1 ? a.queuePriority : i + 1,
              status: OrderStatus.PENDING,
            }));
          const merged = [...itemsWithoutThisOrder, ...newItems];
          try {
            await updateMachineOrderAssignment(assn.id, { productionOrderItems: merged });
          } catch (e) {
            syncErrors++;
            console.warn("Failed to update assignment for machine", mid, e);
            toast.error(e instanceof Error ? e.message : "Failed to update machine assignment");
          }
        }

        if (syncErrors === 0 && (currentMachineIds.size > 0 || previousMachineIds.size > 0)) {
          toast.success("Order and machine assignments updated.");
        } else if (syncErrors === 0) {
          toast.success("Production order updated successfully!");
        } else {
          toast.success("Order updated. Some machine links could not be synced.");
        }
        router.push('/production/supervisor');
      } else {
        // Extract error message with better handling
        const errorMessage = response.error?.message || 'Failed to update order';
        const errorCode = response.error?.code || 'UNKNOWN_ERROR';
        const errorDetails = response.error?.details || [];
        
        console.error('Order update error:', {
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
          fullError: response.error
        });
        
        // Show error in toast
        toast.error(errorMessage, {
          duration: 5000,
        });
        
        // Also show alert for critical errors
        if (errorCode === '400' || errorCode === 'VALIDATION_ERROR') {
          alert(`Error: ${errorMessage}\n\nPlease check the form and try again.`);
        }
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      // This should rarely happen now since service returns errors in ApiResponse format
      const errorMessage = error?.message || 'Failed to update order';
      
      // Show both toast and alert for unexpected errors
      toast.error(errorMessage, { duration: 5000 });
      alert(`Unexpected Error: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (order) {
      // Reload articles with BOM data
      const articlesWithBOM = await Promise.all(order.articles.map(async (article: any) => {
        try {
          const productResponse = await axios.get(`${API_BASE_URL}/products?page=1&limit=1000&search=${encodeURIComponent(article.articleNumber)}`);
          const products = productResponse.data.results || [];
          const matchingProduct = products.find((p: Product) => p.factoryCode === article.articleNumber);
          
          if (matchingProduct) {
            const fullProductResponse = await axios.get(`${API_BASE_URL}/products/${matchingProduct.id}`);
            const fullProduct = fullProductResponse.data;
            
            const normalizedBOM = await Promise.all((fullProduct.bom || []).map(async (bomItem: any) => {
              let yarnCatalogId = bomItem.yarnCatalogId || bomItem.materialId || '';
              let yarnName = bomItem.yarnName || bomItem.materialName || '';
              
              if (typeof yarnCatalogId === 'object' && yarnCatalogId !== null) {
                yarnCatalogId = yarnCatalogId.id || yarnCatalogId._id || '';
              }
              
              if (!yarnName && yarnCatalogId) {
                if (yarnCatalogs[yarnCatalogId]) {
                  yarnName = yarnCatalogs[yarnCatalogId].yarnName;
                } else {
                  try {
                    const yarnResponse = await yarnCatalogService.getYarnCatalogById(yarnCatalogId);
                    if (yarnResponse) {
                      yarnName = yarnResponse.yarnName;
                      setYarnCatalogs(prev => ({ ...prev, [yarnCatalogId]: yarnResponse }));
                    }
                  } catch (error) {
                    console.warn(`Failed to fetch yarn catalog ${yarnCatalogId}:`, error);
                  }
                }
              }
              
              return {
                yarnCatalogId,
                quantity: bomItem.quantity || 0,
                yarnName: yarnName || 'Unknown Yarn'
              };
            }));
            
            return {
              id: article._id ?? article.id,
              articleNumber: article.articleNumber,
              plannedQuantity: article.plannedQuantity,
              linkingType: article.linkingType,
              priority: article.priority,
              machineId: typeof article.machineId === 'object' && article.machineId ? article.machineId.id || article.machineId._id : article.machineId || '',
              remarks: article.remarks || '',
              productId: matchingProduct.id,
              bom: normalizedBOM
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch BOM for article ${article.articleNumber}:`, error);
        }
        
        return {
          id: article._id ?? article.id,
          articleNumber: article.articleNumber,
          plannedQuantity: article.plannedQuantity,
          linkingType: article.linkingType,
          priority: article.priority,
          machineId: typeof article.machineId === 'object' && article.machineId ? article.machineId.id || article.machineId._id : article.machineId || '',
          remarks: article.remarks || ''
        };
      }));

      setFormData({
        orderPriority: order.priority,
        articles: articlesWithBOM,
        orderNote: order.orderNote || ''
      });
    }
    setErrors({});
  };

  if (isLoading) {
    return (
      <div className="main-content !p-[10px]">
        <Seo title="Edit Production Order"/>
        <div className="bg-white shadow-sm border border-gray-100 rounded flex justify-center items-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3 opacity-50"></div>
            <p className="text-[11px] font-medium text-gray-500">Loading order...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="main-content !p-[10px]">
        <Seo title="Edit Production Order"/>
        <div className="bg-white shadow-sm border border-gray-100 rounded text-center py-12 px-4">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-xl text-gray-300"></i>
          </div>
          <h3 className="text-sm font-bold text-gray-800 mb-2">Order not found</h3>
          <p className="text-[11px] text-gray-500 mb-4">The order doesn't exist or has been deleted.</p>
          <Link href="/production/supervisor" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
            <i className="ri-arrow-left-line text-xs"></i> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Edit Production Order"/>

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-[10px] border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Edit Production Order</h1>
              <HelpIcon
                title="Edit Production Order"
                content={
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-base mb-1">What is this page?</h4>
                      <p className="text-gray-700 text-sm">Edit an existing production order. Update order priority, notes, and article details.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-base mb-1">What can you edit?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                        <li><strong>Order Priority:</strong> Urgent, High, Medium, Low</li>
                        <li><strong>Articles:</strong> Add, remove, or modify article details</li>
                        <li><strong>Order Note:</strong> Order-level instructions</li>
                      </ul>
                    </div>
                  </div>
                }
              />
            </div>
            <Link href="/production/supervisor" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm">
              <i className="ri-arrow-left-line text-xs"></i> Back
            </Link>
          </div>
        </div>

        <div className="p-[10px] border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Order Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Order Number</label>
              <p className="text-[12px] font-bold text-gray-900">{order.orderNumber}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Status</label>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                order.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                order.status === 'On Hold' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order.status}
              </span>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Floor</label>
              <p className="text-[12px] font-bold text-gray-900">{order.currentFloor}</p>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[11px] font-medium text-gray-600">
              {order.articles.length} Article{order.articles.length > 1 ? 's' : ''} · Total Qty: {order.articles.reduce((sum, article) => sum + article.plannedQuantity, 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="p-[10px]">
              <form onSubmit={handleSubmit}>
                {/* Order Priority + Order Note */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="form-label text-sm">Order Priority *</label>
                    <select
                      className="form-select form-select-sm text-xs py-1 px-2 h-8"
                      value={formData.orderPriority}
                      onChange={(e) => handleInputChange('orderPriority', e.target.value as 'Urgent' | 'High' | 'Medium' | 'Low')}
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-sm">Order Name (optional)</label>
                    <textarea
                      className="form-control form-control-sm text-xs py-1 px-2"
                      rows={1}
                      placeholder="Add order-level instructions..."
                      value={formData.orderNote || ''}
                      onChange={(e) => handleInputChange('orderNote', e.target.value)}
                    />
                  </div>
                </div>

                {/* Articles Table */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-800">Articles ({formData.articles.length})</h3>
                    <button
                      type="button"
                      onClick={addArticle}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 shadow-sm"
                      title="Add Article"
                    >
                      <i className="ri-add-line text-xs"></i> Add Article
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full table-fixed">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="w-32 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article #</th>
                          <th className="w-24 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                          <th className="w-32 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linking</th>
                          <th className="w-24 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                          <th className="w-40 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                          <th className="w-20 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Queue #</th>
                          <th className="w-40 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                          <th className="w-16 px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.articles.map((article, index) => (
                          <tr key={article.id} className="hover:bg-gray-50">
                            <td className="px-2 py-2">
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  className={`form-control form-control-sm flex-1 text-xs py-1 px-2 h-8 ${errors[`article_${index}_articleNumber`] ? 'border-red-500' : ''}`}
                                  value={article.articleNumber}
                                  onChange={(e) => handleArticleChange(index, 'articleNumber', e.target.value)}
                                  placeholder="Factory Code"
                                />
                                <button
                                  type="button"
                                  onClick={() => openProductModal(index)}
                                  className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
                                  title="Select Factory Code"
                                >
                                  <i className="ri-search-line text-xs"></i>
                                </button>
                              </div>
                              {errors[`article_${index}_articleNumber`] && (
                                <div className="text-red-600 text-[10px] mt-0.5 truncate">{errors[`article_${index}_articleNumber`]}</div>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <NumericInput
                                className={`form-control-sm w-full text-xs py-1 px-2 h-8 ${errors[`article_${index}_quantity`] ? 'border-red-500' : ''} disabled:opacity-60 disabled:cursor-not-allowed`}
                                value={article.plannedQuantity}
                                onChange={(value) => handleArticleChange(index, 'plannedQuantity', value)}
                                placeholder="0"
                                allowDecimals
                                disabled={!article.productId}
                              />
                              {errors[`article_${index}_quantity`] && (
                                <div className="text-red-600 text-[10px] mt-0.5 truncate">{errors[`article_${index}_quantity`]}</div>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <select
                                className="form-select form-select-sm w-full text-xs py-1 px-2 h-8 disabled:opacity-60 disabled:cursor-not-allowed"
                                value={article.linkingType}
                                onChange={(e) => handleArticleChange(index, 'linkingType', e.target.value as 'Auto Linking' | 'Rosso Linking' | 'Hand Linking')}
                                disabled={!article.productId}
                              >
                                <option value="Auto Linking">Auto</option>
                                <option value="Rosso Linking">Rosso</option>
                                <option value="Hand Linking">Hand</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <select
                                className="form-select form-select-sm w-full text-xs py-1 px-2 h-8 disabled:opacity-60 disabled:cursor-not-allowed"
                                value={article.priority}
                                onChange={(e) => handleArticleChange(index, 'priority', e.target.value as 'Urgent' | 'High' | 'Medium' | 'Low')}
                                disabled={!article.productId}
                              >
                                <option value="Urgent">Urgent</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setMachineModalArticleIndex(index);
                                  setMachineSearchQuery('');
                                  setShowMachineModal(true);
                                }}
                                disabled={isLoadingMachines || !article.productId}
                                title={!article.productId ? 'Select factory code first' : undefined}
                                className="form-control form-control-sm w-full text-xs py-1 px-2 h-8 text-left bg-white border border-gray-300 rounded flex items-center justify-between gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <span className="truncate">
                                  {article.machineId
                                    ? machines.find((m) => (m._id || m.id) === article.machineId)?.machineCode ?? 'Select Machine'
                                    : 'Select Machine'}
                                </span>
                                <i className="ri-arrow-down-s-line text-gray-500 shrink-0" />
                              </button>
                            </td>
                            <td className="px-2 py-2">
                              {article.machineId ? (
                                <NumericInput
                                  className="form-control form-control-sm w-full text-xs py-1 px-2 h-8"
                                  value={article.queuePriority}
                                  onChange={(value) => handleArticleChange(index, "queuePriority", value >= 1 ? value : undefined)}
                                  placeholder="1"
                                  allowDecimals={false}
                                />
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                className="form-control form-control-sm w-full text-xs py-1 px-2 h-8 disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="Remarks..."
                                value={article.remarks || ''}
                                onChange={(e) => handleArticleChange(index, 'remarks', e.target.value)}
                                disabled={!article.productId}
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              {formData.articles.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeArticle(article.id)}
                                  className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100"
                                  title="Remove Article"
                                >
                                  <i className="ri-delete-bin-line text-xs"></i>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Article BOM Section */}
                {formData.articles.some(article => article.bom && article.bom.length > 0) && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Article BOM</h3>
                    <div className="space-y-4">
                      {formData.articles.map((article, articleIndex) => {
                        if (!article.bom || article.bom.length === 0 || article.plannedQuantity === 0) return null;
                        
                        return (
                          <div key={article.id} className="border rounded-lg p-3 bg-gray-50">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Article: {article.articleNumber || 'N/A'} (Qty: {article.plannedQuantity})
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-2 py-1 text-left">Yarn Name</th>
                                    <th className="px-2 py-1 text-right">Per Unit (g)</th>
                                    <th className="px-2 py-1 text-right">Total Required (g)</th>
                                    <th className="px-2 py-1 text-right">Total Required (kg)</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white">
                                  {article.bom.map((bomItem, bomIndex) => {
                                    // Use yarnCatalogId if available, otherwise fall back to materialId
                                    const yarnCatalogId = bomItem.yarnCatalogId || bomItem.materialId || '';
                                    const yarn = yarnCatalogId ? yarnCatalogs[yarnCatalogId] : null;
                                    const yarnName = bomItem.yarnName || bomItem.materialName || yarn?.yarnName || 'Unknown Yarn';
                                    const perUnitGrams = bomItem.quantity || 0;
                                    const totalGrams = perUnitGrams * article.plannedQuantity;
                                    const totalKg = totalGrams / 1000;
                                    
                                    return (
                                      <tr key={bomIndex} className="border-b">
                                        <td className="px-2 py-1">{yarnName}</td>
                                        <td className="px-2 py-1 text-right">{perUnitGrams.toFixed(2)}</td>
                                        <td className="px-2 py-1 text-right">{totalGrams.toFixed(2)}</td>
                                        <td className="px-2 py-1 text-right">{totalKg.toFixed(3)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Total BOM Requirements Section */}
                {calculateTotalBOM().length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Total BOM Requirements</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-2 py-2 text-left">Yarn Name</th>
                            <th className="px-2 py-2 text-right">Total Required (g)</th>
                            <th className="px-2 py-2 text-right">Total Required (kg)</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {calculateTotalBOM().map((item) => (
                            <tr key={item.yarnCatalogId} className="border-b">
                              <td className="px-2 py-2 font-medium">{item.yarnName}</td>
                              <td className="px-2 py-2 text-right">{item.totalGrams.toFixed(2)}</td>
                              <td className="px-2 py-2 text-right">{item.totalKg.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-between items-center pt-4 border-t border-gray-100 mt-4 gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50"
                    onClick={handleReset}
                  >
                    <i className="ri-refresh-line text-xs"></i> Reset
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/production/supervisor" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50">
                      <i className="ri-close-line text-xs"></i> Cancel
                    </Link>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 shadow-sm disabled:opacity-60"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line text-xs"></i> Update Order
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
        </div>
      </div>

      {/* Machine Selection — side drawer from right */}
      {showMachineModal && machineModalArticleIndex !== null && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 z-0 bg-black/50" onClick={() => { setShowMachineModal(false); setMachineModalArticleIndex(null); setMachineSearchQuery(''); }} aria-hidden />
          <div className="relative z-10 ml-auto w-full max-w-xl h-full bg-white shadow-xl flex flex-col border-l border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-[10px] border-b border-gray-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Select Machine</h3>
                <p className="text-xs text-gray-500 mt-0.5">Only machines with an active needle (from Catalog → Needle Configuration) are shown.</p>
                {machineModalArticleIndex !== null && formData.articles[machineModalArticleIndex]?.needleSizeFromProduct && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Filtered by item needle: <strong>{formData.articles[machineModalArticleIndex].needleSizeFromProduct}</strong>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMachineModal(false);
                  setMachineModalArticleIndex(null);
                  setMachineSearchQuery('');
                }}
                className="w-7 h-7 flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded hover:bg-gray-100"
              >
                <i className="ri-close-line text-sm" />
              </button>
            </div>
            {machineModalArticleIndex !== null && formData.articles[machineModalArticleIndex]?.needleSizeFromProduct?.trim() && (
              <div className="p-[10px] border-b border-gray-200 shrink-0">
                <input
                  type="text"
                  className="bg-white border border-gray-200 text-[11px] rounded px-3 py-1.5 w-full focus:ring-0 focus:border-purple-300"
                  placeholder="Search by machine code, number, model or floor..."
                  value={machineSearchQuery}
                  onChange={(e) => setMachineSearchQuery(e.target.value)}
                />
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-[10px] min-h-0">
              {(() => {
                const article =
                  machineModalArticleIndex !== null ? formData.articles[machineModalArticleIndex] : null;
                const needleSize = article?.needleSizeFromProduct?.trim();
                if (!needleSize || needleSize.length === 0) {
                  return (
                    <div className="text-center py-8 px-4">
                      <p className="text-red-600 text-sm font-medium">
                        No needle set for this item. Please set Needles attribute in item (Catalog) before selecting a machine.
                      </p>
                    </div>
                  );
                }
                // Only show machines whose *active* needle (from Needle Configuration) matches the item's needle
                const machinesForNeedle = machines.filter((m) => {
                  const id = m._id ?? m.id;
                  const activeNeedle = id ? machineActiveNeedleMap.get(String(id)) ?? '' : '';
                  if ((activeNeedle || '').trim() !== needleSize) return false;
                  const config = m.needleSizeConfig || [];
                  const hasInConfig = config.some((c) => (c.needleSize || '').trim() === needleSize);
                  const hasSingle = (m.needleSize || '').trim() === needleSize;
                  return hasInConfig || hasSingle;
                });
                const q = machineSearchQuery.trim().toLowerCase();
                const filtered = q
                  ? machinesForNeedle.filter(
                      (m) =>
                        (m.machineCode ?? '').toLowerCase().includes(q) ||
                        (m.machineNumber ?? '').toLowerCase().includes(q) ||
                        (m.model ?? '').toLowerCase().includes(q) ||
                        (m.floor ?? '').toLowerCase().includes(q)
                    )
                  : machinesForNeedle;
                return filtered.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <p className="text-red-600 text-sm font-medium">
                      No machine found for this item. Please check needle in item and needle available in machine.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                    <table className="min-w-full text-sm border border-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Active needle</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"># POs</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Article #</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filtered.map((machine) => {
                          const id = machine._id || machine.id;
                          const activeNeedle = id ? machineActiveNeedleMap.get(String(id)) : "";
                          const assn = id ? assignmentsByMachineId.get(String(id)) : null;
                          const items = assn?.productionOrderItems ?? [];
                          const poCount = new Set(items.map((i) => String(i.productionOrder ?? "")).filter(Boolean)).size;
                          const articleNumbers = items.map((i) => i.articleNumber || i.article || "—").join(", ");
                          return (
                            <tr
                              key={id}
                              onClick={() => {
                                handleArticleChange(machineModalArticleIndex, "machineId", id ?? "");
                                setShowMachineModal(false);
                                setMachineModalArticleIndex(null);
                                setMachineSearchQuery("");
                              }}
                              className="cursor-pointer hover:bg-purple-50 transition-colors"
                            >
                              <td className="px-3 py-2 font-medium text-gray-900">{machine.machineCode}</td>
                              <td className="px-3 py-2 text-xs text-emerald-600 font-medium">{activeNeedle || "—"}</td>
                              <td className="px-3 py-2 text-xs text-gray-600">{poCount}</td>
                              <td className="px-3 py-2 text-xs text-gray-600 max-w-[200px] truncate" title={articleNumbers}>{articleNumbers || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Product Selection — side drawer from right */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 z-0" onClick={closeProductModal} aria-hidden />
          <div className="relative z-10 ml-auto w-full max-w-xl h-full bg-white shadow-xl flex flex-col border-l border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-[10px] border-b border-gray-200 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-gray-800">Select Factory Code</h3>
              <button onClick={closeProductModal} className="w-7 h-7 flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded hover:bg-gray-100">
                <i className="ri-close-line text-sm"></i>
              </button>
            </div>
            <div className="p-[10px] border-b border-gray-200 shrink-0">
              <input
                type="text"
                className="bg-white border border-gray-200 text-[11px] rounded px-3 py-1.5 w-full focus:ring-0 focus:border-purple-300"
                placeholder="Search by factory code or product name..."
                value={productSearchQuery}
                onChange={(e) => {
                  setProductSearchQuery(e.target.value);
                  fetchProducts(e.target.value);
                }}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-[10px] min-h-0">
              {isLoadingProducts ? (
                <div className="text-center py-8">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No products found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Factory Code</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-medium">{product.factoryCode || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm">{product.name}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => selectProduct(product)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
                            >
                              Select
                            </button>
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
      )}
    </div>
  );
};

const EditOrderPage = () => {
  return (
    <Suspense fallback={
      <div className="main-content !p-[10px]">
        <Seo title="Edit Production Order"/>
        <div className="bg-white shadow-sm border border-gray-100 rounded flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50"></div>
          <p className="ml-3 text-[11px] font-medium text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <EditOrderContent />
    </Suspense>
  );
};

export default EditOrderPage;
