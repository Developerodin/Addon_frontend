"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { productionService, CreateOrderRequest } from "@/shared/services/productionService";
import {
  getMachineActiveNeedleMap,
  getAssignmentByMachineId,
  addProductionOrderItemsToAssignment,
  OrderStatus,
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
  /** Queue position (1, 2, 3...) for this article on the selected machine (needle config productionOrderItems.priority) */
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

interface AddOrderFormData {
  orderPriority: 'High' | 'Medium' | 'Low' | 'Urgent';
  articles: Article[];
  orderNote?: string;
}

const AddOrderPage = () => {
  const router = useRouter();
  
  const [formData, setFormData] = useState<AddOrderFormData>({
    orderPriority: 'Medium',
    articles: [
      {
        id: '1',
        articleNumber: '',
        plannedQuantity: 0,
        linkingType: 'Auto Linking',
        priority: 'Medium',
        machineId: '',
        queuePriority: undefined,
        remarks: ''
      }
    ],
    orderNote: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
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
  /** Machine ID -> active needle (from Catalog Needle Configuration); used to filter and show needle in dropdown */
  const [machineActiveNeedleMap, setMachineActiveNeedleMap] = useState<Map<string, string>>(new Map());
  /** Needles attribute value ID -> display name (for filtering machines by product's Needles) */
  const [needlesValueIdToName, setNeedlesValueIdToName] = useState<Record<string, string>>({});

  // Valid production floors (API may return e.g. "knitting Floor" – match case-insensitively)
  const validProductionFloors = [
    'Knitting', 'Linking', 'Checking', 'Washing', 'Boarding', 
    'Silicon', 'Secondary Checking', 'Branding', 'Final Checking', 
    'Warehouse', 'Dispatch'
  ];
  const floorMatches = (floor: string) =>
    validProductionFloors.some((f) => floor?.toLowerCase().includes(f.toLowerCase()));

  // Fetch machine IDs that have active needle (from needle configuration), then fetch machines and filter
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
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch machines');
      }

      const data = await response.json();
      const machinesArray = Array.isArray(data.results) ? data.results : [];
      // Only machines with valid production floors AND with an active needle in needle configuration
      const validMachines = machinesArray.filter((machine: Machine) => {
        const id = machine._id ?? machine.id;
        if (!id) return false;
        if (!floorMatches(machine.floor)) return false;
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

  // Fetch Needles attribute option values (id -> name) for resolving product's Needles when filtering machines
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

  // Fetch machines on component mount
  useEffect(() => {
    fetchMachines();
    fetchYarnCatalogs();
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

  // Open product selection modal — set loading true first so modal shows loader immediately (no blank flash)
  const openProductModal = (articleIndex: number) => {
    setSelectedArticleIndex(articleIndex);
    setProductSearchQuery('');
    setIsLoadingProducts(true);
    setShowProductModal(true);
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
    const productId = product.id ?? (product as any)._id;
    if (!productId) return;

    try {
      // Fetch full product details with BOM
      const productResponse = await axios.get(`${API_BASE_URL}/products/${productId}`);
      const fullProduct = productResponse.data?.data ?? productResponse.data;

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

      // Resolve Needles attribute to display name (for machine filtering)
      const attrs = fullProduct.attributes || {};
      const needlesRaw = attrs.Needles ?? attrs.needles;
      const needleSizeFromProduct =
        needlesRaw != null && needlesRaw !== ''
          ? needlesValueIdToName[String(needlesRaw)] ?? String(needlesRaw)
          : undefined;

      // Update article with factory code and product details
      setFormData(prev => ({
        ...prev,
        articles: prev.articles.map((article, index) => 
          index === selectedArticleIndex 
              ? { 
                ...article, 
                articleNumber: product.factoryCode,
                productId: productId,
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
      // Still update with factory code even if BOM fetch fails (no needle filter in catch - product fetch may have failed)
      setFormData(prev => ({
        ...prev,
        articles: prev.articles.map((article, index) => 
          index === selectedArticleIndex 
            ? { 
                ...article, 
                articleNumber: product.factoryCode,
                productId: productId
              }
            : article
        )
      }));
      closeProductModal();
      toast.success(`Factory code ${product.factoryCode} selected`);
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

  // No order-level inputs; all editing happens within articles

  const handleArticleChange = (articleIndex: number, field: keyof Article, value: string | number) => {
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

    setIsSubmitting(true);
    setApiError(null); // Clear previous errors
    
    try {
      const orderData: CreateOrderRequest = {
        priority: formData.orderPriority,
        articles: formData.articles.map(article => ({
          articleNumber: article.articleNumber,
          plannedQuantity: article.plannedQuantity,
          linkingType: article.linkingType,
          priority: article.priority,
          machineId: article.machineId || undefined,
          remarks: article.remarks
        })),
        orderNote: formData.orderNote || undefined
      };

      console.log('Submitting order data:', orderData);
      const response = await productionService.createOrder(orderData);
      console.log('Order creation response:', response);

      if (!response.success) {
        const errorMessage = response.error?.message || 'Failed to create order';
        const errorCode = response.error?.code || 'UNKNOWN_ERROR';
        const errorDetails = response.error?.details || [];
        console.error('Order creation error:', { code: errorCode, message: errorMessage, details: errorDetails, fullError: response.error });
        setApiError(errorMessage);
        toast.error(errorMessage, { duration: 6000 });
        alert(`Error: ${errorMessage}\n\nPlease check the form and try again.`);
        return;
      }

      const raw = response.data as any;
      const createdOrder = raw?.order ?? raw?.data ?? raw;
      let orderId: string | undefined =
        createdOrder?.id ?? createdOrder?._id ?? raw?.id ?? raw?._id ?? raw?.order?.id ?? raw?.data?.id;
      const orderNumber = createdOrder?.orderNumber ?? raw?.orderNumber ?? orderId ?? '';

      if (!orderId) {
        setApiError('Order created but could not read order ID from response.');
        toast.error('Order created but could not read order ID. Check console.');
        return;
      }

      // Always fetch full order so we get article _id (Mongo ObjectId). Create response often has only short id.
      let createdArticles: any[] = [];
      const orderRes = await productionService.getOrder(orderId);
      if (orderRes.success && orderRes.data?.articles?.length) {
        createdArticles = orderRes.data.articles;
      }
      if (createdArticles.length === 0) {
        createdArticles = createdOrder?.articles ?? raw?.articles ?? [];
      }

      // Resolve articleId per row – must be Mongo _id (24-char hex), never short code (e.g. ARTMLJSS8X0039)
      const byMachine = new Map<string, { productionOrder: string; article: string; priority?: number }[]>();
      formData.articles.forEach((article, i) => {
        const machineId = (article.machineId ?? '').toString().trim();
        if (!machineId) return;
        const art = createdArticles[i] ?? createdArticles.find(
          (a: any) => typeof a === 'object' && (a?.articleNumber || a?.factoryCode || '').toString() === (article.articleNumber || '').toString()
        );
        const rawId = typeof art === 'string' ? art : (art?._id ?? art?.id);
        const articleId = typeof rawId === 'string' && /^[a-fA-F0-9]{24}$/.test(rawId) ? rawId : null;
        if (!articleId) return;
        if (!byMachine.has(machineId)) byMachine.set(machineId, []);
        const queuePriority = article.queuePriority != null && article.queuePriority >= 1 ? article.queuePriority : i + 1;
        byMachine.get(machineId)!.push({
          productionOrder: orderId!,
          article: articleId,
          priority: queuePriority,
        });
      });

      // Always call assignment API when there are machines; keep page open until done, then redirect
      if (byMachine.size > 0) {
        toast.loading('Linking order to machine(s)...', { id: 'linking-machines' });
      }
      let assignmentErrors = 0;
      for (const [machineId, items] of byMachine) {
        try {
          const assignment = await getAssignmentByMachineId(machineId);
          if (assignment?.id) {
            await addProductionOrderItemsToAssignment(
              assignment.id,
              items.map((it) => ({ ...it, status: OrderStatus.PENDING }))
            );
          } else {
            assignmentErrors++;
            toast.error(`No active assignment for selected machine. Order ${orderNumber} created but machine link skipped.`);
          }
        } catch (err: any) {
          assignmentErrors++;
          console.warn(`Could not link order to machine ${machineId} in needle config:`, err);
          toast.error(err?.message || `Failed to link order to machine. Order ${orderNumber} created.`);
        }
      }
      toast.dismiss('linking-machines');

      if (assignmentErrors === 0 && byMachine.size > 0) {
        toast.success(`Order ${orderNumber} created and linked to ${byMachine.size} machine(s).`);
      } else if (assignmentErrors === 0) {
        toast.success('Production order created successfully!');
      } else {
        toast.success(`Order ${orderNumber} created. Some machine links could not be updated.`);
      }
      router.push('/production/supervisor');
    } catch (error: any) {
      console.error('Error creating order:', error);
      // This should rarely happen now since service returns errors in ApiResponse format
      const errorMessage = error?.message || 'Failed to create order';
      
      // Set API error state
      setApiError(errorMessage);
      
      // Show both toast and alert for unexpected errors
      toast.error(errorMessage, { duration: 6000 });
      alert(`Unexpected Error: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      orderPriority: 'Medium',
      articles: [
        {
          id: '1',
          articleNumber: '',
          plannedQuantity: 0,
          linkingType: 'Auto Linking',
          priority: 'Medium',
          machineId: '',
          queuePriority: undefined,
          remarks: ''
        }
      ],
      orderNote: ''
    });
    setErrors({});
    setApiError(null);
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Add New Production Order"/>

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-[10px] border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Add New Production Order</h1>
              <HelpIcon
                title="Add New Production Order"
                content={
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-base mb-1">What is this page?</h4>
                      <p className="text-gray-700 text-sm">Create a new production order with article details and specifications.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-base mb-1">Required Fields:</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                        <li><strong>Order Priority:</strong> Urgent, High, Medium, or Low</li>
                        <li><strong>Article Number:</strong> Any alphanumeric characters</li>
                        <li><strong>Planned Quantity:</strong> Number of units to produce (1-100,000)</li>
                        <li><strong>Linking Type:</strong> Auto, Rosso, or Hand linking</li>
                        <li><strong>Priority (per article):</strong> Urgent, High, Medium, or Low</li>
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

        <div className="p-[10px]">
              <form onSubmit={handleSubmit}>
                {/* API Error Display */}
                {apiError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <i className="ri-error-warning-line text-red-600 text-xl"></i>
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-red-800">Error Creating Order</h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{apiError}</p>
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setApiError(null)}
                            className="text-sm text-red-800 hover:text-red-900 underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Order Priority + Order Note */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="form-label text-sm">Order Priority *</label>
                    <select
                      className="form-select form-select-sm text-xs py-1 px-2 h-8"
                      value={formData.orderPriority}
                      onChange={(e) => setFormData(prev => ({ ...prev, orderPriority: e.target.value as 'Urgent' | 'High' | 'Medium' | 'Low' }))}
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="form-label text-sm">Order Name (optional)</label>
                    <textarea
                      className="form-control form-control-sm text-xs py-1 px-2"
                      rows={1}
                      placeholder="Add order-level instructions..."
                      value={formData.orderNote || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, orderNote: e.target.value }))}
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
                                title={!article.productId ? 'Select an article (factory code) first' : undefined}
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
                                  onChange={(value) => handleArticleChange(index, 'queuePriority', value >= 1 ? value : undefined)}
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
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="ri-add-line text-xs"></i> Create Order
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
            <div className="p-[10px] border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Select Machine</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Only machines with an active needle (from Catalog → Needle Configuration) are shown.
                </p>
                {machineModalArticleIndex !== null &&
                  formData.articles[machineModalArticleIndex]?.needleSizeFromProduct && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Filtered by item needle:{" "}
                    <strong>{formData.articles[machineModalArticleIndex].needleSizeFromProduct}</strong>
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
              <div className="p-[10px] border-b border-gray-200">
                <input
                  type="text"
                  className="bg-white border border-gray-200 text-[11px] rounded px-3 py-1.5 w-full focus:ring-0 focus:border-purple-300"
                  placeholder="Search by machine code, number, model or floor..."
                  value={machineSearchQuery}
                  onChange={(e) => setMachineSearchQuery(e.target.value)}
                />
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {(() => {
                const article =
                  machineModalArticleIndex !== null
                    ? formData.articles[machineModalArticleIndex]
                    : null;
                const needleSize = article?.needleSizeFromProduct?.trim();
                // No needle on item: show error, do not show machine list
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
                  <ul className="divide-y divide-gray-200 max-h-[50vh] overflow-y-auto">
                    {filtered.map((machine) => {
                      const id = machine._id || machine.id;
                      const activeNeedle = id ? machineActiveNeedleMap.get(String(id)) : '';
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => {
                              handleArticleChange(machineModalArticleIndex, 'machineId', id ?? '');
                              setShowMachineModal(false);
                              setMachineModalArticleIndex(null);
                              setMachineSearchQuery('');
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex justify-between items-start gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-medium">{machine.machineCode}</span>
                              {activeNeedle ? (
                                <span className="ml-2 text-xs text-emerald-600 font-medium">Needle: {activeNeedle}</span>
                              ) : null}
                            </div>
                            <span className="text-gray-500 text-xs truncate shrink-0">
                              {machine.machineNumber} · {machine.model} · {machine.floor}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
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
          <div className="relative z-10 ml-auto w-full max-w-xl h-full bg-white shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-[10px] border-b border-gray-200 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-gray-800">Select Factory Code</h3>
              <button onClick={closeProductModal} type="button" className="w-7 h-7 flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded hover:bg-gray-100">
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
                  setIsLoadingProducts(true);
                  fetchProducts(e.target.value);
                }}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              {isLoadingProducts ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-500">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">No products found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Factory Code</th>
                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Needle</th>
                        <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {products.map((product) => {
                        const productId = product.id ?? (product as any)._id;
                        const needlesRaw = product.attributes?.Needles ?? product.attributes?.needles;
                        const needleDisplay =
                          needlesRaw != null && needlesRaw !== ''
                            ? needlesValueIdToName[String(needlesRaw)] ?? String(needlesRaw)
                            : '—';
                        return (
                          <tr key={productId} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5 text-xs font-medium">{product.factoryCode || 'N/A'}</td>
                            <td className="px-2 py-1.5 text-xs truncate max-w-[140px]">{product.name}</td>
                            <td className="px-2 py-1.5 text-xs text-gray-600">{needleDisplay}</td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); selectProduct({ ...product, id: productId }); }}
                                className="flex items-center gap-1 px-2 py-1 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
                              >
                                Select
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
        </div>
      )}
    </div>
  );
};

export default AddOrderPage;
