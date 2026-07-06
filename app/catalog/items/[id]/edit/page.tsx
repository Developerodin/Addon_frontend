"use client"
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Seo from '@/shared/layout-components/seo/seo';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import yarnCatalogService, { YarnCatalog } from '@/shared/services/yarnCatalogService';
import { styleCodeService, StyleCode } from '@/shared/services/styleCodeService';
import { StyleCodeSelectModal } from '@/app/catalog/style-codes/components/StyleCodeSelectModal';
import { ProcessSequenceEditor } from '@/app/catalog/items/components/ProcessSequenceEditor';
import ProductImageUploadField from '@/app/catalog/items/components/ProductImageUploadField';
import { useSelector } from 'react-redux';
import { isDesignUser, isProductionUser, isFinalUser, shouldShowAttribute, shouldShowAttributeForFinal } from '@/shared/utils/userUtils';

interface StyleCodeItem {
  styleCodeId?: string;
  styleCode: string;
  eanCode: string;
  mrp: number;
  brand?: string;
  pack?: string;
}

interface Product {
  id: string;
  name: string;
  softwareCode: string;
  internalCode: string;
  knittingCode?: string;
  vendorCode: string;
  factoryCode: string;
  productionType?: string;
  styleCodes?: StyleCodeItem[];
  styleCode?: string; // Keep for backward compatibility
  eanCode?: string; // Keep for backward compatibility
  description: string;
  category?: {
    id: string;
    name: string;
  };
  attributes: Record<string, string>;
  bom: Array<{
    yarnCatalogId: string;
    yarnName: string;
    quantity: number;
  }>;
  rawMaterials?: Array<{ rawMaterialId: string; rawMaterialName?: string; quantity: number }>;
  processes: Array<{
    processId: string;
  }>;
  image?: string;
}

interface Category {
  id: string;
  name: string;
}

interface AttributeOption {
  id: string;
  name: string;
}

interface AttributeOptionValue {
  _id: string;
  name: string;
  image?: string;
  sortOrder?: number;
}

interface AttributeCategory {
  id: string;
  name: string;
  type?: string;
  attributeType?: string; // 'Manufacturing' | 'Warehouse', default 'Manufacturing'
  sortOrder?: number;
  options?: AttributeOption[];
  optionValues: AttributeOptionValue[];
}

interface ProcessType {
  id: string;
  name: string;
  type?: string;
  description?: string;
}

const API_ENDPOINTS = {
  products: `${API_BASE_URL}/products`,
  categories: `${API_BASE_URL}/categories?page=1&limit=200`,
  attributes: `${API_BASE_URL}/product-attributes?page=1&limit=200`,
  processes: `${API_BASE_URL}/processes?page=1&limit=200`
};

const EditProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const productId = (params as any)?.id as string;
  const { user } = useSelector((state: any) => state.auth);
  const isDesign = isDesignUser(user);
  const isProduction = isProductionUser(user);
  const isFinal = isFinalUser(user);

  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [yarnCatalogs, setYarnCatalogs] = useState<YarnCatalog[]>([]);
  const [attributeCategories, setAttributeCategories] = useState<AttributeCategory[]>([]);
  const [processes, setProcesses] = useState<ProcessType[]>([]);
  const [activeTab, setActiveTab] = useState('general');

  // Yarn catalog pagination states
  const [currentYarnPage, setCurrentYarnPage] = useState(1);
  const [totalYarnPages, setTotalYarnPages] = useState(1);
  const [totalYarnResults, setTotalYarnResults] = useState(0);
  const yarnsPerPage = 50;

  // Modal states for yarn catalog selection
  const [isYarnModalOpen, setIsYarnModalOpen] = useState(false);
  const [selectedBomIndex, setSelectedBomIndex] = useState<number | null>(null);
  const [modalYarnSearchQuery, setModalYarnSearchQuery] = useState('');
  const [modalCurrentYarnPage, setModalCurrentYarnPage] = useState(1);
  const [modalYarnCatalogs, setModalYarnCatalogs] = useState<YarnCatalog[]>([]);
  const [modalTotalYarnPages, setModalTotalYarnPages] = useState(1);
  const [modalTotalYarnResults, setModalTotalYarnResults] = useState(0);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Style code select modal
  const [styleCodeModalOpen, setStyleCodeModalOpen] = useState(false);
  const [styleCodeModalIndex, setStyleCodeModalIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState<Product>({
    id: '',
    name: '',
    softwareCode: '',
    internalCode: '',
    knittingCode: '',
    vendorCode: '',
    factoryCode: '',
    productionType: 'internal',
    styleCodes: [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }],
    description: '',
    category: { id: '', name: '' },
    attributes: {},
    bom: [],
    rawMaterials: [],
    processes: []
  });

  const [styleCodeOptions, setStyleCodeOptions] = useState<StyleCodeItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          productResponse,
          categoriesResponse,
          attributesResponse,
          processesResponse,
          styleCodesRes
        ] = await Promise.all([
          axios.get(`${API_ENDPOINTS.products}/${productId}`),
          axios.get(API_ENDPOINTS.categories),
          axios.get(API_ENDPOINTS.attributes),
          axios.get(API_ENDPOINTS.processes),
          styleCodeService.list({ limit: 500, sortBy: 'styleCode:asc' })
        ]);

        // Normalize categories
        const categories = categoriesResponse.data.results || [];
        setCategories(categories);
        const styleCodesResponse = (styleCodesRes as any)?.results || [];
        const styleOptions = styleCodesResponse.map((sc: any) => ({
          styleCodeId: sc.id,
          styleCode: sc.styleCode,
          eanCode: sc.eanCode,
          mrp: sc.mrp,
          brand: sc.brand,
          pack: sc.pack,
        }));
        // Set initial options; may be extended below if product contains IDs not in this page.
        setStyleCodeOptions(styleOptions);

        // Normalize product data
        let product = productResponse.data;
        // Debug: log backend BOM
        console.log('Backend BOM:', productResponse.data);
        
        // Ensure category is properly initialized
        if (!product.category) {
          product.category = { id: '', name: '' };
        } else if (typeof product.category === 'string') {
          const catObj = categories.find((c: Category) => c.id === product.category);
          if (catObj) {
            product.category = catObj;
          } else {
            product.category = { id: product.category, name: 'Unknown Category' };
          }
        }

        // Normalize styleCodes - backend may send array of IDs only, or array of objects.
        // Fix: styleCode master list here is limited; resolve missing IDs on-demand so edit page never shows blanks.
        if (product.styleCodes && Array.isArray(product.styleCodes)) {
          type StyleOption = {
            styleCodeId: string;
            styleCode: string;
            eanCode: string;
            mrp: number;
            brand?: string;
            pack?: string;
          };

          const rawIds: string[] = product.styleCodes
            .map((sc: any) => (typeof sc === 'string' ? sc : (sc?.styleCodeId ?? sc?._id ?? sc?.id ?? '')))
            .map((id: any) => String(id || '').trim())
            .filter((id: string): id is string => !!id);

          const optionsById = new Map<string, StyleOption>(
            styleOptions
              .filter((o: any) => !!o?.styleCodeId)
              .map((o: any) => [String(o.styleCodeId), o as StyleOption])
          );

          const missingIds: string[] = Array.from(new Set(rawIds.filter((id: string) => !optionsById.has(id))));
          if (missingIds.length > 0) {
            const fetched = await Promise.all(
              missingIds.map((id: string) =>
                styleCodeService
                  .get(id)
                  .then((sc): StyleOption => ({
                    styleCodeId: sc.id,
                    styleCode: sc.styleCode ?? '',
                    eanCode: sc.eanCode ?? '',
                    mrp: sc.mrp ?? 0,
                    brand: sc.brand ?? '',
                    pack: sc.pack ?? '',
                  }))
                  .catch(() => null)
              )
            );
            fetched
              .filter((x): x is StyleOption => x != null && !!x.styleCodeId)
              .forEach((opt: StyleOption) => optionsById.set(String(opt.styleCodeId), opt));
          }

          // Ensure dropdown options also contain fetched entries (so modal/search sees them)
          const mergedOptions = Array.from(optionsById.values());
          setStyleCodeOptions(mergedOptions);

          product.styleCodes = product.styleCodes.map((sc: any) => {
            const id = typeof sc === 'string' ? sc : (sc?.styleCodeId ?? sc?._id ?? sc?.id ?? '');
            const sid = String(id || '').trim();
            const match = sid ? optionsById.get(sid) : undefined;
            return {
              styleCodeId: sid,
              styleCode: match?.styleCode ?? (typeof sc === 'object' ? sc.styleCode : '') ?? '',
              eanCode: match?.eanCode ?? (typeof sc === 'object' ? sc.eanCode : '') ?? '',
              mrp: match?.mrp ?? (typeof sc === 'object' && (sc.mrp != null) ? sc.mrp : 0) ?? 0,
              brand: match?.brand ?? (typeof sc === 'object' ? sc.brand : '') ?? '',
              pack: match?.pack ?? (typeof sc === 'object' ? sc.pack : '') ?? ''
            };
          });
        } else if (product.styleCode || product.eanCode) {
          product.styleCodes = [{
            styleCodeId: '',
            styleCode: product.styleCode || '',
            eanCode: product.eanCode || '',
            mrp: 0,
            brand: '',
            pack: ''
          }];
        } else {
          product.styleCodes = [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }];
        }

        // (styleCodeOptions already set above)
        
        product.productionType = product.productionType || 'internal';

        // Defensive: ensure attributes, bom, processes are arrays/objects
        product.attributes = product.attributes || {};
        
        // Normalize attribute data
        const normalizedAttributes = { ...product.attributes };
        
        // Log the original attributes
        console.log('Original product attributes:', product.attributes);
        
        // Helper function to get process ID
        const getProcessId = (proc: any): string => {
          if (typeof proc === 'object') {
            if (proc.id) return proc.id;
            if (proc.process?.id) return proc.process.id;
            if (proc.processId?.id) return proc.processId.id;
            if (typeof proc.process === 'string') return proc.process;
            if (typeof proc.processId === 'string') return proc.processId;
          }
          return proc || '';
        };

        // Process the bom and processes arrays
        product.bom = Array.isArray(product.bom)
          ? product.bom.map((item: any) => ({
              yarnCatalogId: typeof item.yarnCatalogId === 'object' && item.yarnCatalogId !== null
                ? item.yarnCatalogId.id || item.yarnCatalogId._id
                : item.yarnCatalogId || item.materialId || '',
              yarnName: item.yarnName || item.materialName || '',
              quantity: item.quantity || 0
            }))
          : [];
        // Debug: log normalized BOM
        console.log('Normalized BOM:', product.bom);
        
        // Normalize processes to always have processId as string
        product.processes = Array.isArray(product.processes)
          ? product.processes.map((proc: any) => ({
              processId: getProcessId(proc)
            }))
          : [];

        console.log('Normalized processes:', product.processes);
        
        // Set the product data with normalized attributes (rawMaterials section removed from form)
        setFormData({
          ...product,
          attributes: normalizedAttributes,
          processes: product.processes,
          rawMaterials: []
        });
        console.log('Product data loaded:', product);
        console.log('Product attributes:', product.attributes);

        // Process attribute categories
        let attrCats = attributesResponse.data.results || [];
        
        // Map attribute categories with their option values - handle both data structures
        attrCats = attrCats.map((cat: any) => {
          // Check which format is available in the API response
          const hasOptionValues = Array.isArray(cat.optionValues) && cat.optionValues.length > 0;
          const hasOptions = Array.isArray(cat.options) && cat.options.length > 0;
          
          // Transform options to optionValues format if needed; ensure each option has _id (from id or _id)
          let optionValues = hasOptionValues
            ? (cat.optionValues || []).map((opt: any) => ({
                _id: opt._id || opt.id,
                name: opt.name,
                sortOrder: opt.sortOrder ?? 0
              }))
            : [];
          
          // If only options is available, convert to optionValues format
          if (!hasOptionValues && hasOptions) {
            optionValues = cat.options.map((opt: any) => ({
              _id: opt.id || opt._id,
              name: opt.name,
              sortOrder: opt.sortOrder || 0
            }));
          }
          
          console.log(`Category ${cat.name} options:`, { 
            hasOptionValues, 
            hasOptions, 
            optionValues 
          });
          
          return {
            ...cat,
            optionValues: optionValues,
            options: cat.options || [], // Keep for backward compatibility
            attributeType: (cat.attributeType === 'Warehouse' ? 'Warehouse' : 'Manufacturing') as string
          };
        });
        
        console.log('Processed attribute categories:', attrCats);
        setAttributeCategories(attrCats);

        setProcesses((processesResponse.data.results || []) as ProcessType[]);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Error loading product data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  // Fetch yarn catalogs
  useEffect(() => {
    const fetchYarnCatalogs = async () => {
      try {
        const response = await yarnCatalogService.getYarnCatalogs({
          page: currentYarnPage,
          limit: yarnsPerPage,
          status: 'active'
        });
        setYarnCatalogs(response.results || []);
        setTotalYarnPages(response.totalPages || 1);
        setTotalYarnResults(response.totalResults || 0);
      } catch (error) {
        console.error('Error fetching yarn catalogs:', error);
        setYarnCatalogs([]);
      }
    };

    const isInitialLoad = currentYarnPage === 1;
    const delay = isInitialLoad ? 0 : 500;
    
    const timeoutId = setTimeout(() => {
      fetchYarnCatalogs();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [currentYarnPage]);

  // Fetch yarn catalogs for modal
  useEffect(() => {
    if (!isYarnModalOpen) return;

    const fetchModalYarnCatalogs = async () => {
      setIsModalLoading(true);
      try {
        const response = await yarnCatalogService.getYarnCatalogs({
          page: modalCurrentYarnPage,
          limit: yarnsPerPage,
          yarnName: modalYarnSearchQuery.trim() || undefined,
          status: 'active'
        });
        setModalYarnCatalogs(response.results || []);
        setModalTotalYarnPages(response.totalPages || 1);
        setModalTotalYarnResults(response.totalResults || 0);
      } catch (error) {
        console.error('Error fetching yarn catalogs for modal:', error);
        setModalYarnCatalogs([]);
      } finally {
        setIsModalLoading(false);
      }
    };

    // Debounce search
    const delay = modalYarnSearchQuery.trim() ? 500 : 0;
    const timeoutId = setTimeout(() => {
      fetchModalYarnCatalogs();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [isYarnModalOpen, modalYarnSearchQuery, modalCurrentYarnPage]);

  // Normalize product attributes from value-ID to value-name once when categories are loaded (API expects name → value string)
  const attributesNormalizedRef = useRef(false);
  useEffect(() => {
    if (attributeCategories.length === 0 || attributesNormalizedRef.current) return;
    if (Object.keys(formData.attributes).length === 0) {
      attributesNormalizedRef.current = true;
      return;
    }
    attributesNormalizedRef.current = true;
    setFormData(prev => {
      const next: Record<string, string> = {};
      for (const cat of attributeCategories) {
        const raw = prev.attributes[cat.name] ?? prev.attributes[cat.id];
        if (raw == null || raw === '') continue;
        const option = cat.optionValues?.find((o: any) =>
          String(o._id || o.id) === String(raw) || o.name === raw
        );
        next[cat.name] = option ? option.name : String(raw);
      }
      return { ...prev, attributes: next };
    });
  }, [attributeCategories, formData.attributes]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        category: { id: value, name: categories.find(c => c.id === value)?.name || '' }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  /** Persist uploaded S3 URL on the product form. */
  const handleProductImageChange = (url: string) => {
    setFormData((prev) => ({ ...prev, image: url }));
  };

  const handleAttributeChange = (categoryName: string, value: string) => {
    console.log('Changing attribute:', categoryName, 'to value:', value);
    
    // Find the category ID that corresponds to this name if available
    const category = attributeCategories.find(cat => cat.name === categoryName);
    const categoryId = category?.id || '';
    
    console.log('Category found:', category ? 'yes' : 'no', 'ID:', categoryId);
    
    setFormData(prev => {
      const updatedAttributes = {
        ...prev.attributes,
        [categoryName]: value // Use the category name as the key
      };
      
      console.log('Updated attributes:', updatedAttributes);
      return {
        ...prev,
        attributes: updatedAttributes
      };
    });
  };

  const handleBomItemChange = (index: number, field: 'yarnCatalogId' | 'quantity', value: string | number) => {
    setFormData(prev => {
      const newBom = [...prev.bom];
      if (field === 'yarnCatalogId') {
        // Search in both yarnCatalogs and modalYarnCatalogs
        const selectedYarn = yarnCatalogs.find(y => y.id === value) || 
                            modalYarnCatalogs.find(y => y.id === value);
        newBom[index] = {
          ...newBom[index],
          yarnCatalogId: value.toString(),
          yarnName: selectedYarn?.yarnName || ''
        };
      } else {
        newBom[index] = {
          ...newBom[index],
          quantity: typeof value === 'string' ? parseFloat(value) : value
        };
      }
      return { ...prev, bom: newBom };
    });
  };

  const handleStyleCodeChange = (index: number, field: 'styleCode' | 'eanCode' | 'mrp' | 'brand' | 'pack', value: string | number) => {
    setFormData(prev => {
      const newStyleCodes = [...(prev.styleCodes || [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }])];
      newStyleCodes[index] = {
        ...newStyleCodes[index],
        [field]: field === 'mrp' ? (typeof value === 'string' ? parseFloat(value) || 0 : value) : value
      };
      return { ...prev, styleCodes: newStyleCodes };
    });
  };

  const handleStyleCodeSelect = (index: number, styleCodeId: string) => {
    const option = styleCodeOptions.find((sc) => sc.styleCodeId === styleCodeId);
    if (!option) return;
    setFormData(prev => {
      const newStyleCodes = [...(prev.styleCodes || [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }])];
      newStyleCodes[index] = {
        styleCodeId: option.styleCodeId,
        styleCode: option.styleCode,
        eanCode: option.eanCode,
        mrp: option.mrp,
        brand: option.brand,
        pack: option.pack,
      };
      return { ...prev, styleCodes: newStyleCodes };
    });
  };

  const handleStyleCodeInput = (index: number, value: string) => {
    const match = styleCodeOptions.find(
      (sc) => sc.styleCode.toLowerCase() === value.trim().toLowerCase()
    );
    if (match) {
      handleStyleCodeSelect(index, match.styleCodeId || '');
      return;
    }
    setFormData(prev => {
      const newStyleCodes = [...(prev.styleCodes || [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }])];
      newStyleCodes[index] = {
        styleCodeId: '',
        styleCode: value,
        eanCode: '',
        mrp: 0,
        brand: '',
        pack: '',
      };
      return { ...prev, styleCodes: newStyleCodes };
    });
  };

  const addStyleCode = () => {
    setFormData(prev => ({
      ...prev,
      styleCodes: [...(prev.styleCodes || [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }]), { styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }]
    }));
  };

  const removeStyleCode = (index: number) => {
    setFormData(prev => {
      const currentStyleCodes = prev.styleCodes || [{ styleCode: '', eanCode: '', mrp: 0 }];
      if (currentStyleCodes.length > 1) {
        return { ...prev, styleCodes: currentStyleCodes.filter((_, i) => i !== index) };
      }
      return prev;
    });
  };

  const handleStyleCodeSelectFromModal = (sc: StyleCode) => {
    if (styleCodeModalIndex === null) return;
    setFormData(prev => {
      const newStyleCodes = [...(prev.styleCodes || [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }])];
      newStyleCodes[styleCodeModalIndex] = {
        styleCodeId: sc.id,
        styleCode: sc.styleCode,
        eanCode: sc.eanCode,
        mrp: sc.mrp,
        brand: sc.brand,
        pack: sc.pack,
      };
      return { ...prev, styleCodes: newStyleCodes };
    });
    setStyleCodeModalOpen(false);
    setStyleCodeModalIndex(null);
  };

  const addBomItem = () => {
    setFormData(prev => ({
      ...prev,
      bom: [...prev.bom, { yarnCatalogId: '', yarnName: '', quantity: 0 }]
    }));
  };

  const removeBomItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      bom: prev.bom.filter((_, i) => i !== index)
    }));
  };

  // Open yarn selection modal
  const handleOpenYarnModal = (index: number) => {
    setSelectedBomIndex(index);
    setIsYarnModalOpen(true);
    setModalYarnSearchQuery('');
    setModalCurrentYarnPage(1);
  };

  // Close yarn selection modal
  const handleCloseYarnModal = () => {
    setIsYarnModalOpen(false);
    setSelectedBomIndex(null);
    setModalYarnSearchQuery('');
    setModalCurrentYarnPage(1);
  };

  // Select yarn from modal
  const handleSelectYarn = (yarn: YarnCatalog) => {
    if (selectedBomIndex !== null) {
      setFormData(prev => {
        const newBom = [...prev.bom];
        newBom[selectedBomIndex] = {
          ...newBom[selectedBomIndex],
          yarnCatalogId: yarn.id,
          yarnName: yarn.yarnName
        };
        return { ...prev, bom: newBom };
      });
      handleCloseYarnModal();
    }
  };

  // Handle modal search
  const handleModalYarnSearch = (query: string) => {
    setModalYarnSearchQuery(query);
    setModalCurrentYarnPage(1); // Reset to first page when search changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Console log all form data before validation
    console.log('=== FORM DATA BEFORE VALIDATION ===');
    console.log('Form Data:', formData);
    console.log('User Type - isDesign:', isDesign, 'isProduction:', isProduction, 'isFinal:', isFinal);

    // Validate required fields based on user type
    if (isProduction) {
      // Production user: Factory Code required only when not outsourced
      if (formData.productionType !== 'outsourced' && (!formData.factoryCode || formData.factoryCode.trim() === '')) {
        alert('Please fill in all required fields');
        return;
      }
    } else if (isFinal) {
      // Final user: no required-field validation on frontend
    } else if (isDesign) {
      const outsourced = formData.productionType === 'outsourced';
      const needCodes = !outsourced;
      if (!formData.name || formData.name.trim() === '' || !formData.category) {
        alert('Please fill in all required fields');
        return;
      }
      if (needCodes && (
          !formData.internalCode || formData.internalCode.trim() === '' ||
          !formData.knittingCode || formData.knittingCode.trim() === '' ||
          !formData.vendorCode || formData.vendorCode.trim() === '')) {
        alert('Please fill in all required fields');
        return;
      }
    } else {
      const outsourced = formData.productionType === 'outsourced';
      const needCodeFields = !outsourced;
      if (!formData.name || formData.name.trim() === '' || !formData.category ||
          (needCodeFields && (!formData.factoryCode || formData.factoryCode.trim() === ''))) {
        alert('Please fill in all required fields.');
        return;
      }
      if (needCodeFields && (
          !formData.internalCode || formData.internalCode.trim() === '' ||
          !formData.knittingCode || formData.knittingCode.trim() === '' ||
          !formData.vendorCode || formData.vendorCode.trim() === '')) {
        alert('Please fill in all required fields.');
        return;
      }
    }

    // Needles attribute is required when it is shown on the form
    const needlesCategory = attributeCategories.find(c => c.name.toLowerCase() === 'needles');
    if (needlesCategory) {
      const showNeedles = isProduction
        || (isFinal && shouldShowAttributeForFinal(needlesCategory.name, isFinal))
        || (isDesign && shouldShowAttribute(needlesCategory.name, isDesign))
        || (!isDesign && !isFinal && !isProduction);
      if (showNeedles) {
        const needlesValue = (formData.attributes[needlesCategory.name] || formData.attributes[needlesCategory.id] || '').toString().trim();
        if (!needlesValue) {
          alert('Needles is a required field. Please select a value before saving.');
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      console.log('Submitting with attributes:', formData.attributes);
      
      // Prepare the base product data
      const productData: any = {};
    productData.productionType = formData.productionType || 'internal';

      // Style codes: send only IDs (entries with valid styleCodeId)
      const styleCodeIds = (formData.styleCodes || [])
        .filter(sc => sc.styleCodeId && String(sc.styleCodeId).trim())
        .map(sc => sc.styleCodeId);

      console.log('=== STYLE CODES (IDs only) ===');
      console.log('Original styleCodes:', formData.styleCodes);
      console.log('styleCodeIds:', styleCodeIds);

      if (isProduction) {
        // Production user: Only Factory Code
        productData.factoryCode = formData.factoryCode.trim();
      } else if (isFinal) {
        // Final user: Style Codes (IDs only) and Description
        productData.styleCodes = styleCodeIds;
        productData.description = formData.description.trim();
      } else if (isDesign) {
        // Design user: Basic fields (optional when outsourced)
        productData.name = formData.name.trim();
        productData.softwareCode = formData.softwareCode?.trim() ?? '';
        productData.internalCode = formData.internalCode?.trim() ?? '';
        productData.knittingCode = formData.knittingCode?.trim() ?? '';
        productData.vendorCode = formData.vendorCode?.trim() ?? '';
        productData.category = formData.category?.id || '';
      } else {
        // Other users: All fields (Software/Internal/Knitting/Vendor optional when outsourced)
        productData.name = formData.name.trim();
        productData.softwareCode = formData.softwareCode?.trim() ?? '';
        productData.internalCode = formData.internalCode?.trim() ?? '';
        productData.knittingCode = (formData.knittingCode || '').trim();
        productData.vendorCode = formData.vendorCode?.trim() ?? '';
        productData.category = formData.category?.id || '';
        productData.factoryCode = formData.factoryCode.trim();
        productData.styleCodes = styleCodeIds;
        productData.description = formData.description.trim();
      }

      console.log('=== PRODUCT DATA TO BE SENT ===');
      console.log('Product Data:', JSON.stringify(productData, null, 2));

      // Attributes - filter based on user type
      let allowedAttributes;
      if (isProduction) {
        // Production user: Only "needles" attribute
        allowedAttributes = Object.fromEntries(
          Object.entries(formData.attributes).filter(([key]) => {
            const category = attributeCategories.find(cat => 
              cat.name === key || cat.id === key
            );
            return category && category.name.toLowerCase() === 'needles';
          })
        );
      } else if (isFinal) {
        // Final user: Only Brand, Age group, MRP
        allowedAttributes = Object.fromEntries(
          Object.entries(formData.attributes).filter(([key]) => {
            const category = attributeCategories.find(cat => 
              cat.name === key || cat.id === key
            );
            return category ? shouldShowAttributeForFinal(category.name, isFinal) : false;
          })
        );
      } else if (isDesign) {
        // Design user: Only allowed attributes
        allowedAttributes = Object.fromEntries(
          Object.entries(formData.attributes).filter(([key]) => {
            const category = attributeCategories.find(cat => 
              cat.name === key || cat.id === key
            );
            return category ? shouldShowAttribute(category.name, isDesign) : false;
          })
        );
      } else {
        // Other users: All attributes
        allowedAttributes = formData.attributes;
      }
      
      // Send attributes as attribute name -> option value name (string from masters; backend accepts e.g. Needles: "7 GG")
      const attrsFiltered = Object.entries(allowedAttributes).filter(([key]) => !['brand', 'pack'].includes(key.toLowerCase()));
      productData.attributes = Object.fromEntries(
        attrsFiltered
          .map(([key, valueName]) => {
            const category = attributeCategories.find(c => c.name === key || c.id === key);
            const option = category?.optionValues?.find((o: any) =>
              o.name === valueName || String(o._id || o.id) === String(valueName)
            );
            return [key, option ? option.name : valueName];
          })
          .filter(([, v]) => v)
      );

      // BOM, rawMaterials and Processes for production users and non-design/non-final/non-production users
      if (isProduction || (!isDesign && !isFinal && !isProduction)) {
        productData.bom = formData.bom.filter(item => item.yarnCatalogId && item.quantity > 0).map(item => ({
          yarnCatalogId: item.yarnCatalogId,
          yarnName: item.yarnName,
          quantity: Number(item.quantity)
        }));
        productData.processes = formData.processes.filter(proc => proc.processId).map(proc => ({
          processId: proc.processId
        }));
      }

      if (typeof formData.image === 'string') {
        productData.image = formData.image.trim();
      }

      await axios.patch(`${API_ENDPOINTS.products}/${productId}`, productData, {
        headers: { 'Content-Type': 'application/json' }
      });

      alert('Product updated successfully!');
      router.push('/catalog/items');
    } catch (error: any) {
      console.error('Error updating product:', error);
      // Show more detailed error message
      const errorMessage = error.response?.data?.message || error.message || 'Error updating product';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="text-center py-10">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Edit Product" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Edit Product</h3>
            </div>
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    {['general', 'attributes', ...(isDesign || isFinal ? [] : ['bom', 'processes'])].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* General Tab */}
                {activeTab === 'general' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isProduction ? (
                      // Production user: only Production Type + Factory Code
                      <>
                        <div>
                          <label className="form-label">Production Type *</label>
                          <select
                            name="productionType"
                            className="form-control"
                            value={formData.productionType ?? 'internal'}
                            onChange={(e) => handleInputChange({ target: { name: 'productionType', value: e.target.value } } as any)}
                            required
                          >
                            <option value="internal">Internal</option>
                            <option value="outsourced">Outsourced</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Factory Code{formData.productionType !== 'outsourced' ? ' *' : ''}</label>
                          <input
                            type="text"
                            name="factoryCode"
                            className="form-control"
                            value={formData.factoryCode}
                            onChange={handleInputChange}
                            required={formData.productionType !== 'outsourced'}
                          />
                        </div>
                      </>
                    ) : isFinal ? (
                      // Final user: Production Type + Factory Code above Style Codes, then Style Codes + Description
                      <>
                        <div>
                          <label className="form-label">Production Type *</label>
                          <select
                            name="productionType"
                            className="form-control"
                            value={formData.productionType ?? 'internal'}
                            onChange={(e) => handleInputChange({ target: { name: 'productionType', value: e.target.value } } as any)}
                            required
                          >
                            <option value="internal">Internal</option>
                            <option value="outsourced">Outsourced</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Factory Code{formData.productionType !== 'outsourced' ? ' *' : ''}</label>
                          <input
                            type="text"
                            name="factoryCode"
                            className="form-control"
                            value={formData.factoryCode}
                            onChange={handleInputChange}
                            required={formData.productionType !== 'outsourced'}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex justify-between items-center mb-4">
                            <label className="form-label">Style Codes</label>
                            <button
                              type="button"
                              onClick={addStyleCode}
                              className="ti-btn ti-btn-primary"
                            >
                              <i className="ri-add-line me-2"></i> Add Style Code
                            </button>
                          </div>
                          <div className="space-y-4">
                            {(formData.styleCodes || [{ styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }]).map((styleCodeItem, index) => {
                              const brandOptions = attributeCategories.find(c => c.name.toLowerCase() === 'brand')?.optionValues ?? [];
                              const packOptions = attributeCategories.find(c => c.name.toLowerCase() === 'pack')?.optionValues ?? [];
                              return (
                              <div key={index} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="font-medium text-sm">Style Code Entry {index + 1}</h4>
                                  {(formData.styleCodes || []).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeStyleCode(index)}
                                      className="ti-btn ti-btn-danger ti-btn-sm"
                                    >
                                      <i className="ri-delete-bin-line"></i>
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                  <div>
                                    <label className="form-label">Style Code</label>
                                    <input
                                      type="text"
                                      className="form-control cursor-pointer"
                                      value={styleCodeItem.styleCode}
                                      readOnly
                                      onClick={() => { setStyleCodeModalIndex(index); setStyleCodeModalOpen(true); }}
                                      placeholder="Click to browse style codes..."
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">EAN Code</label>
                                    <input
                                      type="text"
                                      className="form-control bg-gray-50"
                                      value={styleCodeItem.eanCode}
                                      readOnly
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">MRP</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="form-control bg-gray-50"
                                      value={styleCodeItem.mrp}
                                      readOnly
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">Brand</label>
                                    <input
                                      type="text"
                                      className="form-control bg-gray-50"
                                      value={styleCodeItem.brand ?? ''}
                                      readOnly
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">Pack</label>
                                    <input
                                      type="text"
                                      className="form-control bg-gray-50"
                                      value={styleCodeItem.pack ?? ''}
                                      readOnly
                                    />
                                  </div>
                                </div>
                              </div>
                            );})}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="form-label">Description</label>
                          <textarea
                            name="description"
                            className="form-control"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={4}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {!isDesign && (
                          <>
                            <div>
                              <label className="form-label">Name *</label>
                              <input
                                type="text"
                                name="name"
                                className="form-control"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Category *</label>
                              <select
                                name="category"
                                className="form-control"
                                value={formData.category?.id || ''}
                                onChange={handleInputChange}
                                required
                              >
                                <option value="">Select Category</option>
                                {categories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="form-label">Software Code{formData.productionType !== 'outsourced' ? ' *' : ''}</label>
                              <input
                                type="text"
                                name="softwareCode"
                                className="form-control"
                                value={formData.softwareCode}
                                onChange={handleInputChange}
                                required={formData.productionType !== 'outsourced'}
                              />
                            </div>
                            <div>
                              <label className="form-label">Internal Code / Design Code{formData.productionType !== 'outsourced' ? ' *' : ''}</label>
                              <input
                                type="text"
                                name="internalCode"
                                className="form-control"
                                value={formData.internalCode}
                                onChange={handleInputChange}
                                required={formData.productionType !== 'outsourced'}
                              />
                            </div>
                            <div>
                              <label className="form-label">Knitting Code{formData.productionType !== 'outsourced' ? ' *' : ''}</label>
                              <input
                                type="text"
                                name="knittingCode"
                                className="form-control"
                                value={formData.knittingCode || ''}
                                onChange={handleInputChange}
                                required={formData.productionType !== 'outsourced'}
                              />
                            </div>
                            <div>
                              <label className="form-label">Vendor Code{formData.productionType !== 'outsourced' ? ' *' : ''}</label>
                              <input
                                type="text"
                                name="vendorCode"
                                className="form-control"
                                value={formData.vendorCode}
                                onChange={handleInputChange}
                                required={formData.productionType !== 'outsourced'}
                              />
                            </div>
                            <div>
                              <label className="form-label">Production Type *</label>
                              <select
                                name="productionType"
                                className="form-control"
                                value={formData.productionType ?? 'internal'}
                                onChange={(e) => handleInputChange({ target: { name: 'productionType', value: e.target.value } } as any)}
                                required
                              >
                                <option value="internal">Internal</option>
                                <option value="outsourced">Outsourced</option>
                              </select>
                            </div>
                            <div>
                              <label className="form-label">Factory Code{formData.productionType !== 'outsourced' ? ' *' : ''}</label>
                              <input
                                type="text"
                                name="factoryCode"
                                className="form-control"
                                value={formData.factoryCode}
                                onChange={handleInputChange}
                                required={formData.productionType !== 'outsourced'}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <div className="flex justify-between items-center mb-4">
                                <label className="form-label">Style Codes</label>
                                <button
                                  type="button"
                                  onClick={addStyleCode}
                                  className="ti-btn ti-btn-primary"
                                >
                                  <i className="ri-add-line me-2"></i> Add Style Code
                                </button>
                              </div>
                              <div className="space-y-4">
                                {(formData.styleCodes || [{ styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }]).map((styleCodeItem, index) => {
                                  const brandOptions = attributeCategories.find(c => c.name.toLowerCase() === 'brand')?.optionValues ?? [];
                                  const packOptions = attributeCategories.find(c => c.name.toLowerCase() === 'pack')?.optionValues ?? [];
                                  return (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-3">
                                      <h4 className="font-medium text-sm">Style Code Entry {index + 1}</h4>
                                      {(formData.styleCodes || []).length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeStyleCode(index)}
                                          className="ti-btn ti-btn-danger ti-btn-sm"
                                        >
                                          <i className="ri-delete-bin-line"></i>
                                        </button>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                      <div>
                                        <label className="form-label">Style Code</label>
                                        <input
                                          type="text"
                                          className="form-control cursor-pointer"
                                          value={styleCodeItem.styleCode}
                                          readOnly
                                          onClick={() => { setStyleCodeModalIndex(index); setStyleCodeModalOpen(true); }}
                                          placeholder="Click to browse style codes..."
                                        />
                                      </div>
                                      <div>
                                        <label className="form-label">EAN Code</label>
                                        <input
                                          type="text"
                                          className="form-control bg-gray-50"
                                          value={styleCodeItem.eanCode}
                                          readOnly
                                        />
                                      </div>
                                      <div>
                                        <label className="form-label">MRP</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          className="form-control bg-gray-50"
                                          value={styleCodeItem.mrp}
                                          readOnly
                                        />
                                      </div>
                                      <div>
                                        <label className="form-label">Brand</label>
                                        <input
                                          type="text"
                                          className="form-control bg-gray-50"
                                          value={styleCodeItem.brand ?? ''}
                                          readOnly
                                        />
                                      </div>
                                      <div>
                                        <label className="form-label">Pack</label>
                                        <input
                                          type="text"
                                          className="form-control bg-gray-50"
                                          value={styleCodeItem.pack ?? ''}
                                          readOnly
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );})}
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <label className="form-label">Description</label>
                              <textarea
                                name="description"
                                className="form-control"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={4}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="form-label">Product Image</label>
                              <ProductImageUploadField
                                value={formData.image ?? ''}
                                onChange={handleProductImageChange}
                                disabled={isLoading}
                              />
                            </div>
                          </>
                        )}
                        {isDesign && (
                          <>
                            <div>
                              <label className="form-label">Name *</label>
                              <input
                                type="text"
                                name="name"
                                className="form-control"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Category *</label>
                              <select
                                name="category"
                                className="form-control"
                                value={formData.category?.id || ''}
                                onChange={handleInputChange}
                                required
                              >
                                <option value="">Select Category</option>
                                {categories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="form-label">Software Code{formData.productionType !== 'outsourced' ? ' *' : ''}</label>
                              <input
                                type="text"
                                name="softwareCode"
                                className="form-control"
                                value={formData.softwareCode}
                                onChange={handleInputChange}
                                required={formData.productionType !== 'outsourced'}
                              />
                            </div>
                            <div>
                              <label className="form-label">Internal Code / Design Code{formData.productionType !== 'outsourced' ? ' *' : ''}</label>
                              <input
                                type="text"
                                name="internalCode"
                                className="form-control"
                                value={formData.internalCode}
                                onChange={handleInputChange}
                                required={formData.productionType !== 'outsourced'}
                              />
                            </div>
                            <div>
                              <label className="form-label">Knitting Code{formData.productionType !== 'outsourced' ? ' *' : ''}</label>
                              <input
                                type="text"
                                name="knittingCode"
                                className="form-control"
                                value={formData.knittingCode || ''}
                                onChange={handleInputChange}
                                required={formData.productionType !== 'outsourced'}
                              />
                            </div>
                            <div>
                              <label className="form-label">Vendor Code{formData.productionType !== 'outsourced' ? ' *' : ''}</label>
                              <input
                                type="text"
                                name="vendorCode"
                                className="form-control"
                                value={formData.vendorCode}
                                onChange={handleInputChange}
                                required={formData.productionType !== 'outsourced'}
                              />
                            </div>
                            <div>
                              <label className="form-label">Production Type *</label>
                              <select
                                name="productionType"
                                className="form-control"
                                value={formData.productionType ?? 'internal'}
                                onChange={(e) => handleInputChange({ target: { name: 'productionType', value: e.target.value } } as any)}
                                required
                              >
                                <option value="internal">Internal</option>
                                <option value="outsourced">Outsourced</option>
                              </select>
                            </div>
                            <div>
                              <label className="form-label">Factory Code{formData.productionType !== 'outsourced' ? ' *' : ''}</label>
                              <input
                                type="text"
                                name="factoryCode"
                                className="form-control"
                                value={formData.factoryCode}
                                onChange={handleInputChange}
                                required={formData.productionType !== 'outsourced'}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="form-label">Product Image</label>
                              <ProductImageUploadField
                                value={formData.image ?? ''}
                                onChange={handleProductImageChange}
                                disabled={isLoading}
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Attributes Tab - split by Manufacturing / Warehouse */}
                {activeTab === 'attributes' && (() => {
                  const baseFilter = (category: AttributeCategory) => {
                    const nameLower = category.name.toLowerCase();
                    if (nameLower === 'brand' || nameLower === 'pack') return false;
                    if (isProduction) return nameLower === 'needles';
                    if (isFinal) return shouldShowAttributeForFinal(category.name, isFinal);
                    if (isDesign) return shouldShowAttribute(category.name, isDesign);
                    return true;
                  };
                  const filtered = attributeCategories.filter(baseFilter);
                  const manufacturingAttrs = filtered.filter((c) => (c.attributeType ?? 'Manufacturing') === 'Manufacturing');
                  const warehouseAttrs = filtered.filter((c) => c.attributeType === 'Warehouse');

                  const renderAttributeField = (category: AttributeCategory) => {
                    const valueById = formData.attributes[category.id] || '';
                    const valueByName = formData.attributes[category.name] || '';
                    const rawValue = valueById || valueByName;
                    // Resolve ID to option name so select shows correct option (options use value={option.name})
                    const optionValues = category.optionValues || [];
                    const currentValue = !rawValue ? '' : (optionValues.find((o: any) => o.name === rawValue)
                      ? rawValue
                      : (optionValues.find((o: any) => String(o._id || o.id) === String(rawValue))?.name ?? rawValue));
                    const isNeedlesRequired = category.name.toLowerCase() === 'needles' && (
                      isProduction || (isFinal && shouldShowAttributeForFinal(category.name, isFinal)) ||
                      (isDesign && shouldShowAttribute(category.name, isDesign)) || (!isDesign && !isFinal && !isProduction)
                    );
                    return (
                      <div key={category.id} className="space-y-2">
                        <label className="form-label">{category.name}{isNeedlesRequired ? ' *' : ''}</label>
                        <select
                          className="form-control"
                          value={currentValue}
                          onChange={(e) => handleAttributeChange(category.name, e.target.value)}
                        >
                          <option value="">Select {category.name}</option>
                          {category.optionValues?.length ? (
                            category.optionValues.map((option) => (
                              <option key={option._id || (option as any).id} value={option.name}>{option.name}</option>
                            ))
                          ) : (
                            <option value="" disabled>No options available</option>
                          )}
                        </select>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-8">
                      {attributeCategories.length === 0 ? (
                        <div className="text-center py-4">
                          <p>No attribute categories found.</p>
                        </div>
                      ) : (
                        <>
                          <div>
                            <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                              Manufacturing Attributes
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {manufacturingAttrs.length === 0 ? (
                                <p className="text-gray-500 text-sm col-span-2">No manufacturing attributes.</p>
                              ) : (
                                manufacturingAttrs.map(renderAttributeField)
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                              Warehouse Attributes
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {warehouseAttrs.length === 0 ? (
                                <p className="text-gray-500 text-sm col-span-2">No warehouse attributes.</p>
                              ) : (
                                warehouseAttrs.map(renderAttributeField)
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* BOM Tab */}
                {!isDesign && !isFinal && activeTab === 'bom' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Bill of Materials</h3>
                      <button
                        type="button"
                        onClick={addBomItem}
                        className="ti-btn ti-btn-primary"
                        disabled={isLoading}
                      >
                        <i className="ri-add-line me-2"></i> Add Yarn
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table whitespace-nowrap table-bordered min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-start">Yarn Name</th>
                            <th className="text-start">Quantity in Grams</th>
                            <th className="text-start">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.bom.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleOpenYarnModal(index)}
                                  className="form-control text-left bg-white cursor-pointer hover:bg-gray-50"
                                  disabled={isLoading}
                                >
                                  {item.yarnName || 'Select Yarn Catalog'}
                                  <i className="ri-arrow-down-s-line float-right mt-1"></i>
                                </button>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  className="form-control"
                                  value={item.quantity}
                                  onChange={(e) => handleBomItemChange(index, 'quantity', Number(e.target.value))}
                                  disabled={isLoading || !item.yarnCatalogId}
                                  placeholder="Enter quantity"
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => removeBomItem(index)}
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  disabled={isLoading}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Yarn Catalog Selection Modal */}
                    {isYarnModalOpen && (
                      <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                          {/* Background overlay */}
                          <div 
                            className="fixed inset-0 bg-transparent bg-opacity-75 transition-opacity"
                            onClick={handleCloseYarnModal}
                          ></div>

                          {/* Modal panel */}
                          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900" id="modal-title">
                                  Select Yarn Catalog
                                </h3>
                                <button
                                  type="button"
                                  onClick={handleCloseYarnModal}
                                  className="text-gray-400 hover:text-gray-500"
                                >
                                  <i className="ri-close-line text-2xl"></i>
                                </button>
                              </div>

                              {/* Search box */}
                              <div className="mb-4">
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Search yarn catalog by name..."
                                  value={modalYarnSearchQuery}
                                  onChange={(e) => handleModalYarnSearch(e.target.value)}
                                />
                              </div>

                              {/* Yarn catalogs list */}
                              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                                {isModalLoading ? (
                                  <div className="p-8 text-center">
                                    <i className="ri-loader-4-line animate-spin text-2xl text-gray-400"></i>
                                    <p className="mt-2 text-gray-500">Loading yarn catalogs...</p>
                                  </div>
                                ) : modalYarnCatalogs.length === 0 ? (
                                  <div className="p-8 text-center">
                                    <p className="text-gray-500">No yarn catalogs found</p>
                                  </div>
                                ) : (
                                  <table className="table min-w-full">
                                    <thead className="bg-gray-50 sticky top-0">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yarn Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {modalYarnCatalogs.map((yarn) => (
                                        <tr key={yarn.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {yarn.yarnName}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {yarn.yarnType?.name || '-'}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            <button
                                              type="button"
                                              onClick={() => handleSelectYarn(yarn)}
                                              className="ti-btn ti-btn-primary"
                                            >
                                              Select
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>

                              {/* Pagination */}
                              {modalTotalYarnResults > 0 && (
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
                                  <div className="text-sm text-gray-500 whitespace-nowrap">
                                    Showing {((modalCurrentYarnPage - 1) * yarnsPerPage) + 1} to{' '}
                                    {Math.min(modalCurrentYarnPage * yarnsPerPage, modalTotalYarnResults)} of{' '}
                                    {modalTotalYarnResults} yarn catalogs
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => setModalCurrentYarnPage(prev => Math.max(prev - 1, 1))}
                                      disabled={modalCurrentYarnPage === 1 || isModalLoading}
                                      className="ti-btn ti-btn-outline-secondary whitespace-nowrap"
                                    >
                                      <i className="ri-arrow-left-s-line"></i> Previous
                                    </button>
                                    <span className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                                      Page {modalCurrentYarnPage} of {modalTotalYarnPages}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setModalCurrentYarnPage(prev => Math.min(prev + 1, modalTotalYarnPages))}
                                      disabled={modalCurrentYarnPage === modalTotalYarnPages || isModalLoading}
                                      className="ti-btn ti-btn-outline-secondary whitespace-nowrap"
                                    >
                                      Next <i className="ri-arrow-right-s-line"></i>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Processes Tab */}
                {!isDesign && !isFinal && activeTab === 'processes' && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Production Process Sequence</h3>
                    <ProcessSequenceEditor
                      items={formData.processes.map((proc) => ({
                        processId:
                          typeof proc.processId === 'object' &&
                          proc.processId !== null &&
                          'id' in proc.processId
                            ? String((proc.processId as { id: string }).id)
                            : String(proc.processId ?? ''),
                      }))}
                      availableProcesses={processes}
                      onChange={(items) =>
                        setFormData((prev) => ({ ...prev, processes: items }))
                      }
                      disabled={isLoading}
                    />
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => router.push('/catalog/items')}
                    className="ti-btn ti-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <StyleCodeSelectModal
        open={styleCodeModalOpen}
        onClose={() => { setStyleCodeModalOpen(false); setStyleCodeModalIndex(null); }}
        onSelect={handleStyleCodeSelectFromModal}
      />
    </div>
  );
};

export default EditProductPage; 