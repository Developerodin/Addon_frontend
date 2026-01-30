"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { productionService, ProductionOrder, UpdateOrderRequest } from "@/shared/services/productionService";
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
  remarks?: string;
  productId?: string;
  bom?: ProductBOM[];
}

interface Product {
  id: string;
  name: string;
  factoryCode: string;
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
}

interface EditOrderFormData {
  orderPriority: 'High' | 'Medium' | 'Low' | 'Urgent';
  articles: Article[];
  orderNote?: string;
}

const EditOrderContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  
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

  // Load order data and machines
  useEffect(() => {
    if (orderId) {
      loadOrderAndMachines();
    } else {
      toast.error('Order ID is required');
      router.push('/production/supervisor');
    }
  }, [orderId]);

  //  Load both order and machines together
  const loadOrderAndMachines = async () => {
    if (!orderId) return;
    
    setIsLoading(true);
    try {
      // Load machines, yarn catalogs, and order
      await Promise.all([
        fetchMachines(),
        fetchYarnCatalogs()
      ]);
      // Then load order
      await loadOrder();
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

  // Fetch machines from API
  const fetchMachines = async () => {
    try {
      setIsLoadingMachines(true);
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
      // Filter machines to only include those with valid production floors
      const validMachines = machinesArray.filter((machine: Machine) => 
        floorMatches(machine.floor)
      );
      setMachines(validMachines);
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast.error('Failed to load machines');
    } finally {
      setIsLoadingMachines(false);
    }
  };

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

      // Update article with factory code and product details
      setFormData(prev => ({
        ...prev,
        articles: prev.articles.map((article, index) => 
          index === selectedArticleIndex 
            ? { 
                ...article, 
                articleNumber: product.factoryCode,
                productId: product.id,
                bom: normalizedBOM
              }
            : article
        )
      }));

      closeProductModal();
      toast.success(`Factory code ${product.factoryCode} selected`);
    } catch (error) {
      console.error('Error fetching product details:', error);
      // Still update with factory code even if BOM fetch fails
      setFormData(prev => ({
        ...prev,
        articles: prev.articles.map((article, index) => 
          index === selectedArticleIndex 
            ? { 
                ...article, 
                articleNumber: product.factoryCode,
                productId: product.id
              }
            : article
        )
      }));
      closeProductModal();
      toast.success(`Factory code ${product.factoryCode} selected`);
    }
  };

  const loadOrder = async () => {
    if (!orderId) return;
    
    try {
      const response = await productionService.getOrder(orderId);
      
      if (response.success) {
        const orderData = response.data;
        setOrder(orderData);
        // Fetch product BOM for each article if articleNumber matches a product's factoryCode
        const articlesWithBOM = await Promise.all(orderData.articles.map(async (article: any) => {
          try {
            // Try to find product by factory code
            const productResponse = await axios.get(`${API_BASE_URL}/products?page=1&limit=1000&search=${encodeURIComponent(article.articleNumber)}`);
            const products = productResponse.data.results || [];
            const matchingProduct = products.find((p: Product) => p.factoryCode === article.articleNumber);
            
            if (matchingProduct) {
              const fullProductResponse = await axios.get(`${API_BASE_URL}/products/${matchingProduct.id}`);
              const fullProduct = fullProductResponse.data;
              
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
              
              return {
                id: article.id,
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
            id: article.id,
            articleNumber: article.articleNumber,
            plannedQuantity: article.plannedQuantity,
            linkingType: article.linkingType,
            priority: article.priority,
            machineId: typeof article.machineId === 'object' && article.machineId ? article.machineId.id || article.machineId._id : article.machineId || '',
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

    // Validate articles
    formData.articles.forEach((article, index) => {
      if (article.plannedQuantity <= 0) {
        newErrors[`article_${index}_quantity`] = 'Planned Quantity must be greater than 0';
      } else if (article.plannedQuantity > 100000) {
        newErrors[`article_${index}_quantity`] = 'Planned Quantity cannot exceed 100,000';
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

  const handleArticleChange = (articleIndex: number, field: keyof Article, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      articles: prev.articles.map((article, index) => {
        if (index === articleIndex) {
          const updatedArticle = { ...article, [field]: value };
          // If article number is manually changed, clear product association
          if (field === 'articleNumber' && typeof value === 'string') {
            updatedArticle.productId = undefined;
            updatedArticle.bom = undefined;
          }
          return updatedArticle;
        }
        return article;
      })
    }));

    // Clear error when user starts typing
    const errorKey = `article_${articleIndex}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
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
        toast.success('Production order updated successfully!');
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
              id: article.id,
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
          id: article.id,
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
      <div className="main-content">
        <Seo title="Edit Production Order"/>
        <div className="flex justify-center items-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading order...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="main-content">
        <Seo title="Edit Production Order"/>
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-error-warning-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order not found</h3>
          <p className="text-gray-500 mb-4">The order you're looking for doesn't exist or has been deleted.</p>
          <Link href="/production/supervisor" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Edit Production Order"/>
      
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none mb-4">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-xl font-semibold">Edit Production Order</h1>
                <HelpIcon
                  title="Edit Production Order"
                  content={
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-base mb-1">What is this page?</h4>
                        <p className="text-gray-700 text-sm">
                          Edit an existing production order. Update order priority, notes, and article details.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-base mb-1">What can you edit?</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                          <li><strong>Order Priority:</strong> Change urgency level (Urgent, High, Medium, Low)</li>
                          <li><strong>Articles:</strong> Add, remove, or modify article details</li>
                          <li><strong>Article Number:</strong> 4-5 alphanumeric characters (e.g., ART001)</li>
                          <li><strong>Planned Quantity:</strong> Number of units to produce (1-100,000)</li>
                          <li><strong>Linking Type:</strong> Auto, Rosso, or Hand linking</li>
                          <li><strong>Article Priority:</strong> Set individual article priority</li>
                          <li><strong>Machine:</strong> Select machine for each article</li>
                          <li><strong>Order Note:</strong> Update order-level instructions</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-1">Important Notes:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                          <li>You can add or remove articles from the order</li>
                          <li>Article numbers must be unique and contain only uppercase letters and numbers</li>
                          <li>Order status and current floor are managed by the production process</li>
                          <li>Changes will be logged in the system audit trail</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              </div>
              <div className="box-tools">
                <Link href="/production/supervisor" className="ti-btn ti-btn-secondary ti-btn-sm">
                  <i className="ri-arrow-left-line me-1"></i> Back
                </Link>
              </div>
            </div>
          </div>

          {/* Order Information Display */}
          <div className="box mb-6">
            <div className="box-body">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label text-sm font-medium text-gray-600">Order Number</label>
                  <p className="text-lg font-semibold text-gray-900">{order.orderNumber}</p>
                </div>
                <div>
                  <label className="form-label text-sm font-medium text-gray-600">Current Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                  <label className="form-label text-sm font-medium text-gray-600">Current Floor</label>
                  <p className="text-lg font-semibold text-gray-900">{order.currentFloor}</p>
                </div>
              </div>
              <div className="mt-4">
                <label className="form-label text-sm font-medium text-gray-600">Articles</label>
                <p className="text-lg font-semibold text-gray-900">
                  {order.articles.length} Article{order.articles.length > 1 ? 's' : ''} 
                  (Total Qty: {order.articles.reduce((sum, article) => sum + article.plannedQuantity, 0).toLocaleString()})
                </p>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="box">
            <div className="box-body p-4">
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
                    <h3 className="text-base font-semibold text-gray-900">Articles ({formData.articles.length})</h3>
                    <button
                      type="button"
                      onClick={addArticle}
                      className="ti-btn ti-btn-primary ti-btn-w-sm flex items-center gap-2"
                      title="Add Article"
                    >
                      <i className="ri-add-line text-sm"></i>
                      <span>Add Article</span>
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
                                  className="form-control form-control-sm flex-1 text-xs py-1 px-2 h-8"
                                  value={article.articleNumber}
                                  onChange={(e) => handleArticleChange(index, 'articleNumber', e.target.value)}
                                  placeholder="Factory Code"
                                />
                                <button
                                  type="button"
                                  onClick={() => openProductModal(index)}
                                  className="ti-btn ti-btn-primary ti-btn-sm px-2 h-8"
                                  title="Select Factory Code"
                                >
                                  <i className="ri-search-line text-xs"></i>
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <NumericInput
                                className={`form-control-sm w-full text-xs py-1 px-2 h-8 ${errors[`article_${index}_quantity`] ? 'border-danger' : ''}`}
                                value={article.plannedQuantity}
                                onChange={(value) => handleArticleChange(index, 'plannedQuantity', value)}
                                placeholder="0"
                              />
                              {errors[`article_${index}_quantity`] && (
                                <div className="text-danger text-xs mt-1 truncate">{errors[`article_${index}_quantity`]}</div>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <select
                                className="form-select form-select-sm w-full text-xs py-1 px-2 h-8"
                                value={article.linkingType}
                                onChange={(e) => handleArticleChange(index, 'linkingType', e.target.value as 'Auto Linking' | 'Rosso Linking' | 'Hand Linking')}
                              >
                                <option value="Auto Linking">Auto</option>
                                <option value="Rosso Linking">Rosso</option>
                                <option value="Hand Linking">Hand</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <select
                                className="form-select form-select-sm w-full text-xs py-1 px-2 h-8"
                                value={article.priority}
                                onChange={(e) => handleArticleChange(index, 'priority', e.target.value as 'Urgent' | 'High' | 'Medium' | 'Low')}
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
                                disabled={isLoadingMachines}
                                className="form-control form-control-sm w-full text-xs py-1 px-2 h-8 text-left bg-white border border-gray-300 rounded flex items-center justify-between gap-1"
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
                              <input
                                type="text"
                                className="form-control form-control-sm w-full text-xs py-1 px-2 h-8"
                                placeholder="Remarks..."
                                value={article.remarks || ''}
                                onChange={(e) => handleArticleChange(index, 'remarks', e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              {formData.articles.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeArticle(article.id)}
                                  className="ti-btn ti-btn-danger ti-btn-w-sm flex items-center justify-center w-8 h-8"
                                  title="Remove Article"
                                >
                                  <i className="ri-delete-bin-line text-sm"></i>
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
                <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t mt-6 gap-4">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light ti-btn-w-sm flex items-center gap-2 w-full sm:w-auto"
                    onClick={handleReset}
                  >
                    <i className="ri-refresh-line text-sm"></i>
                    <span>Reset Changes</span>
                  </button>

                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Link
                      href="/production/supervisor"
                      className="ti-btn ti-btn-secondary ti-btn-w-sm flex items-center gap-2 w-full sm:w-auto"
                    >
                      <i className="ri-close-line text-sm"></i>
                      <span>Cancel</span>
                    </Link>
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary ti-btn-w-sm flex items-center gap-2 w-full sm:w-auto"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line text-sm"></i>
                          <span>Update Order</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Machine Selection Modal */}
      {showMachineModal && machineModalArticleIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Select Machine</h3>
              <button
                type="button"
                onClick={() => {
                  setShowMachineModal(false);
                  setMachineModalArticleIndex(null);
                  setMachineSearchQuery('');
                }}
                className="ti-btn ti-btn-light ti-btn-sm"
              >
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="p-4 border-b">
              <input
                type="text"
                className="form-control w-full"
                placeholder="Search by machine code, number, model or floor..."
                value={machineSearchQuery}
                onChange={(e) => setMachineSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {(() => {
                const q = machineSearchQuery.trim().toLowerCase();
                const filtered = q
                  ? machines.filter(
                      (m) =>
                        (m.machineCode ?? '').toLowerCase().includes(q) ||
                        (m.machineNumber ?? '').toLowerCase().includes(q) ||
                        (m.model ?? '').toLowerCase().includes(q) ||
                        (m.floor ?? '').toLowerCase().includes(q)
                    )
                  : machines;
                return filtered.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No machines found</div>
                ) : (
                  <ul className="divide-y divide-gray-200 max-h-[50vh] overflow-y-auto">
                    {filtered.map((machine) => {
                      const id = machine._id || machine.id;
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
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex justify-between items-center gap-2"
                          >
                            <span className="font-medium">{machine.machineCode}</span>
                            <span className="text-gray-500 text-xs truncate">
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

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Select Factory Code</h3>
              <button
                onClick={closeProductModal}
                className="ti-btn ti-btn-light ti-btn-sm"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            
            <div className="p-4 border-b">
              <input
                type="text"
                className="form-control w-full"
                placeholder="Search by factory code or product name..."
                value={productSearchQuery}
                onChange={(e) => {
                  setProductSearchQuery(e.target.value);
                  fetchProducts(e.target.value);
                }}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
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
                              className="ti-btn ti-btn-primary px-4 py-2 min-w-[80px] whitespace-nowrap"
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
      <div className="main-content">
        <Seo title="Edit Production Order"/>
        <div className="flex justify-center items-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <EditOrderContent />
    </Suspense>
  );
};

export default EditOrderPage;
