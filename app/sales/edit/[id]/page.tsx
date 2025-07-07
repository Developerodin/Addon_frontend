"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { salesService, SalesRecord, Plant, MaterialCode, getSaleId } from '@/shared/services/salesService';
import axios from 'axios';
import { API_BASE_URL } from '@/shared/data/utilities/api';

interface Store {
  id: string;
  storeName: string;
  storeId: string;
  storeNumber?: string;
  city: string;
  state?: string;
  country?: string;
  addressLine1?: string;
  contactPerson?: string;
  contactPhone?: string;
  isActive: boolean;
  creditRating: string;
}

interface StoresResponse {
  results: Store[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface Product {
  id: string;
  name: string;
  styleCode: string;
  internalCode: string;
  vendorCode: string;
  factoryCode: string;
  eanCode: string;
  description: string;
  category: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductsResponse {
  results: Product[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

const EditSalePage = () => {
  const router = useRouter();
  const params = useParams();
  const saleId = params.id as string;
  

  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [storesLoading, setStoresLoading] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [storeCurrentPage, setStoreCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [storeTotalPages, setStoreTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [storeTotalResults, setStoreTotalResults] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    calendar_date: '',
    plant: '',
    plant_display: '',
    material_code: '',
    material_code_display: '',
    quantity: '',
    mrp: '',
    discount: '0.00',
    gsv: '0.00',
    nsv: '0.00',
    total_tax: '0.00'
  });

  // Load sale data on component mount
  useEffect(() => {
    const loadSale = async () => {
      try {
        if (!saleId || saleId === 'undefined') {
          setError('Invalid sale ID');
          setLoading(false);
          return;
        }

        const sale = await salesService.getSaleById(saleId);
        
        // Handle plant data
        let plantId = '';
        let plantDisplay = '';
        if (typeof sale.plant === 'object' && sale.plant) {
          const plantObj = sale.plant as any;
          plantId = plantObj.id || plantObj._id || '';
          plantDisplay = plantObj.storeId || '';
        } else {
          plantId = sale.plant as string;
          // Fetch store details to get display value
          try {
            const storeResponse = await axios.get(`${API_BASE_URL}/stores/${plantId}`);
            const storeData = storeResponse.data;
            plantDisplay = storeData.storeId || plantId;
            // Set selected store for display
            setSelectedStore({
              id: storeData.id || storeData._id || plantId,
              storeId: storeData.storeId || '',
              storeName: storeData.storeName || '',
              city: storeData.city || storeData.addressLine2 || '',
              isActive: storeData.isActive || false,
              creditRating: storeData.creditRating || ''
            });
            setSelectedStoreId(storeData.id || storeData._id || plantId);
          } catch (error) {
            console.error('Error fetching store details:', error);
            plantDisplay = plantId;
          }
        }

        // Handle material code data
        let materialId = '';
        let materialDisplay = '';
        if (typeof sale.materialCode === 'object' && sale.materialCode) {
          const materialObj = sale.materialCode as any;
          materialId = materialObj.id || materialObj._id || '';
          materialDisplay = materialObj.styleCode || '';
        } else {
          materialId = sale.materialCode as string;
          // Fetch product details to get display value
          try {
            const productResponse = await axios.get(`${API_BASE_URL}/products/${materialId}`);
            const productData = productResponse.data;
            materialDisplay = productData.styleCode || materialId;
            // Set selected product for display
            setSelectedProduct({
              id: productData.id || productData._id || materialId,
              styleCode: productData.styleCode || '',
              name: productData.name || '',
              internalCode: productData.internalCode || '',
              vendorCode: productData.vendorCode || '',
              factoryCode: productData.factoryCode || '',
              eanCode: productData.eanCode || '',
              description: productData.description || '',
              category: productData.category || '',
              status: productData.status || ''
            });
            setSelectedProductId(productData.id || productData._id || materialId);
          } catch (error) {
            console.error('Error fetching product details:', error);
            materialDisplay = materialId;
          }
        }

        // Format date for HTML date input (YYYY-MM-DD)
        const formatDateForInput = (dateString: string) => {
          try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
          } catch (error) {
            console.error('Error formatting date:', error);
            return '';
          }
        };

        setFormData({
          calendar_date: formatDateForInput(sale.date),
          plant: plantId,
          plant_display: plantDisplay,
          material_code: materialId,
          material_code_display: materialDisplay,
          quantity: sale.quantity.toString(),
          mrp: sale.mrp.toString(),
          discount: (sale.discount || 0).toString(),
          gsv: sale.gsv.toString(),
          nsv: sale.nsv.toString(),
          total_tax: (sale.totalTax || 0).toString()
        });


      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sale data');
      } finally {
        setLoading(false);
      }
    };

    if (saleId && saleId !== 'undefined') {
      loadSale();
    } else {
      setError('Invalid sale ID provided');
      setLoading(false);
    }
  }, [saleId]);

  // Fetch products for modal
  const fetchProducts = async (page: number = 1, search: string = '') => {
    setProductsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/products?page=${page}&limit=10&search=${encodeURIComponent(search)}`);
      const data = response.data as ProductsResponse;
      setProducts(data.results);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  // Fetch stores for modal
  const fetchStores = async (page: number = 1, search: string = '') => {
    setStoresLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/stores?page=${page}&limit=10&search=${encodeURIComponent(search)}`);
      const data = response.data as StoresResponse;
      setStores(data.results);
      setStoreTotalPages(data.totalPages);
      setStoreTotalResults(data.totalResults);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setStoresLoading(false);
    }
  };

  // Load products when modal opens
  useEffect(() => {
    if (showProductModal) {
      fetchProducts(1, productSearchQuery);
    }
  }, [showProductModal]);

  // Load stores when modal opens
  useEffect(() => {
    if (showStoreModal) {
      fetchStores(1, storeSearchQuery);
    }
  }, [showStoreModal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };

      // Calculate GSV (Gross Sales Value)
      if (name === 'quantity' || name === 'mrp') {
        const qty = parseFloat(newData.quantity) || 0;
        const mrp = parseFloat(newData.mrp) || 0;
        const discount = parseFloat(newData.discount) || 0;
        
        const gsv = qty * mrp;
        const nsv = gsv - discount;
        const tax = nsv * 0.05; // Assuming 5% tax rate

        newData.gsv = gsv.toFixed(2);
        newData.nsv = nsv.toFixed(2);
        newData.total_tax = tax.toFixed(2);
      }

      return newData;
    });
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSelectedProductId(product.id);
    setFormData(prev => ({
      ...prev,
      material_code: product.id, // Store the product ID
      material_code_display: product.styleCode // Display the style code
    }));
  };

  const handleConfirmProductSelection = () => {
    if (selectedProduct) {
      setShowProductModal(false);
    }
  };

  const handleProductSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts(1, productSearchQuery);
  };

  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store);
    setSelectedStoreId(store.id);
    setFormData(prev => ({
      ...prev,
      plant: store.id, // Store the store ID
      plant_display: store.storeId // Display the store ID
    }));
  };

  const handleConfirmStoreSelection = () => {
    if (selectedStore) {
      setShowStoreModal(false);
    }
  };

  const handleStoreSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setStoreCurrentPage(1);
    fetchStores(1, storeSearchQuery);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Transform form data to match API schema
      const saleData: Partial<SalesRecord> = {
        date: formData.calendar_date,
        plant: formData.plant,
        materialCode: formData.material_code,
        quantity: parseFloat(formData.quantity),
        mrp: parseFloat(formData.mrp),
        gsv: parseFloat(formData.gsv),
        nsv: parseFloat(formData.nsv),
        discount: parseFloat(formData.discount),
        totalTax: parseFloat(formData.total_tax)
      };

      await salesService.updateSale(saleId, saleData);
      router.push('/sales?success=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sale');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <Seo title="Edit Sale"/>
        <div className="text-center py-8">
          <i className="ri-loader-4-line animate-spin text-2xl"></i>
          <p className="mt-2">Loading sale data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Edit Sale"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Edit Sale</h1>
              <div className="box-tools">
                <Link href="/sales" className="ti-btn ti-btn-primary">
                  <i className="ri-arrow-left-line me-2"></i> Back to Sales
                </Link>
              </div>
            </div>
          </div>

          {/* Form Box */}
          <div className="box">
            <div className="box-body">
              {error && (
                <div className="alert alert-danger mb-4">
                  <i className="ri-error-warning-line me-2"></i>
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-12 gap-6">
                  {/* Calendar Date */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      name="calendar_date"
                      value={formData.calendar_date}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* Plant */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Plant ID</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="plant_display"
                        value={formData.plant_display}
                        className="form-control pr-10"
                        placeholder="Click to select store"
                        readOnly
                        onClick={() => setShowStoreModal(true)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowStoreModal(true)}
                      >
                        <i className="ri-search-line"></i>
                      </button>
                    </div>
                    {selectedStore && (
                      <div className="mt-1 text-sm text-gray-600">
                        Selected: {selectedStore.storeName} - {selectedStore.city}
                      </div>
                    )}
                  </div>

                  {/* Material Code */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Material Code</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="material_code_display"
                        value={formData.material_code_display}
                        className="form-control pr-10"
                        placeholder="Click to select material"
                        readOnly
                        onClick={() => setShowProductModal(true)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowProductModal(true)}
                      >
                        <i className="ri-search-line"></i>
                      </button>
                    </div>
                    {selectedProduct && (
                      <div className="mt-1 text-sm text-gray-600">
                        Selected: {selectedProduct.name}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter quantity"
                      min="1"
                      required
                    />
                  </div>

                  {/* MRP */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">MRP</label>
                    <input
                      type="number"
                      name="mrp"
                      value={formData.mrp}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter MRP"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  {/* Discount */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Discount</label>
                    <input
                      type="number"
                      name="discount"
                      value={formData.discount}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter discount"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  {/* Calculated Fields */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">GSV (Calculated)</label>
                    <input
                      type="text"
                      value={formData.gsv}
                      className="form-control"
                      disabled
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">NSV (Calculated)</label>
                    <input
                      type="text"
                      value={formData.nsv}
                      className="form-control"
                      disabled
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Total Tax (Calculated)</label>
                    <input
                      type="text"
                      value={formData.total_tax}
                      className="form-control"
                      disabled
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4">
                  <Link href="/sales" className="ti-btn ti-btn-light">
                    Cancel
                  </Link>
                  <button 
                    type="submit" 
                    className="ti-btn ti-btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <i className="ri-loader-4-line animate-spin me-2"></i>
                        Updating...
                      </>
                    ) : (
                      'Update Sale'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Select Material (Product)</h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Search Bar */}
              <div className="mb-4">
                <form onSubmit={handleProductSearch} className="relative">
                  <input
                    type="text"
                    className="form-control py-3 pr-10"
                    placeholder="Search by product name, style code, or internal code..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </form>
              </div>

              {/* Products Table */}
              {productsLoading ? (
                <div className="text-center py-8">
                  <i className="ri-loader-4-line animate-spin text-2xl"></i>
                  <p className="mt-2">Loading products...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="table whitespace-nowrap table-bordered min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-start">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedProductId !== ''}
                              onChange={() => {
                                if (selectedProductId !== '') {
                                  setSelectedProductId('');
                                  setSelectedProduct(null);
                                  setFormData(prev => ({
                                    ...prev,
                                    material_code: '',
                                    material_code_display: ''
                                  }));
                                }
                              }}
                            />
                          </th>
                          <th className="text-start">Name</th>
                          <th className="text-start">Style Code</th>
                          <th className="text-start">Internal Code</th>
                          <th className="text-start">Vendor Code</th>
                          <th className="text-start">Factory Code</th>
                          <th className="text-start">EAN Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-gray-500">
                              No products found
                            </td>
                          </tr>
                        ) : (
                          products.map((product) => (
                            <tr 
                              key={product.id} 
                              className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                                selectedProductId === product.id ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => handleProductSelect(product)}
                            >
                              <td onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedProductId === product.id}
                                  onChange={() => handleProductSelect(product)}
                                />
                              </td>
                              <td>{product.name}</td>
                              <td>{product.styleCode}</td>
                              <td>{product.internalCode}</td>
                              <td>{product.vendorCode}</td>
                              <td>{product.factoryCode}</td>
                              <td>{product.eanCode}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-500">
                        Showing {totalResults === 0 ? 0 : (currentPage - 1) * 10 + 1} to {totalResults === 0 ? 0 : Math.min(currentPage * 10, totalResults)} of {totalResults} entries
                      </div>
                      <nav aria-label="Page navigation">
                        <ul className="flex flex-wrap items-center">
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                              onClick={() => {
                                setCurrentPage(prev => Math.max(prev - 1, 1));
                                fetchProducts(Math.max(currentPage - 1, 1), productSearchQuery);
                              }}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </button>
                          </li>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <li key={page} className="page-item">
                              <button
                                className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                  currentPage === page 
                                  ? 'bg-primary text-white hover:bg-primary-dark' 
                                  : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                }`}
                                onClick={() => {
                                  setCurrentPage(page);
                                  fetchProducts(page, productSearchQuery);
                                }}
                              >
                                {page}
                              </button>
                            </li>
                          ))}
                          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button
                              className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                              onClick={() => {
                                setCurrentPage(prev => Math.min(prev + 1, totalPages));
                                fetchProducts(Math.min(currentPage + 1, totalPages), productSearchQuery);
                              }}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t space-x-2">
              <button
                onClick={() => setShowProductModal(false)}
                className="ti-btn ti-btn-light"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmProductSelection}
                className="ti-btn ti-btn-primary"
                disabled={!selectedProduct}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Selection Modal */}
      {showStoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Select Store (Plant)</h2>
              <button
                onClick={() => setShowStoreModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Search Bar */}
              <div className="mb-4">
                <form onSubmit={handleStoreSearch} className="relative">
                  <input
                    type="text"
                    className="form-control py-3 pr-10"
                    placeholder="Search by store name, store ID, or city..."
                    value={storeSearchQuery}
                    onChange={(e) => setStoreSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </form>
              </div>

              {/* Stores Table */}
              {storesLoading ? (
                <div className="text-center py-8">
                  <i className="ri-loader-4-line animate-spin text-2xl"></i>
                  <p className="mt-2">Loading stores...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="table whitespace-nowrap table-bordered min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-start">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedStoreId !== ''}
                              onChange={() => {
                                if (selectedStoreId !== '') {
                                  setSelectedStoreId('');
                                  setSelectedStore(null);
                                  setFormData(prev => ({
                                    ...prev,
                                    plant: '',
                                    plant_display: ''
                                  }));
                                }
                              }}
                            />
                          </th>
                          <th className="text-start">Store Name</th>
                          <th className="text-start">Store ID</th>
                          <th className="text-start">City</th>
                          <th className="text-start">Contact Person</th>
                          <th className="text-start">Status</th>
                          <th className="text-start">Credit Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stores.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-gray-500">
                              No stores found
                            </td>
                          </tr>
                        ) : (
                          stores.map((store) => (
                            <tr 
                              key={store.id} 
                              className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                                selectedStoreId === store.id ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => handleStoreSelect(store)}
                            >
                              <td onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedStoreId === store.id}
                                  onChange={() => handleStoreSelect(store)}
                                />
                              </td>
                              <td>{store.storeName}</td>
                              <td>{store.storeId}</td>
                              <td>{store.city}</td>
                              <td>{store.contactPerson || '-'}</td>
                              <td>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  store.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {store.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  store.creditRating.startsWith('A') ? 'bg-green-100 text-green-800' :
                                  store.creditRating.startsWith('B') ? 'bg-yellow-100 text-yellow-800' :
                                  store.creditRating.startsWith('C') ? 'bg-blue-100 text-blue-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {store.creditRating}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {storeTotalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-500">
                        Showing {storeTotalResults === 0 ? 0 : (storeCurrentPage - 1) * 10 + 1} to {storeTotalResults === 0 ? 0 : Math.min(storeCurrentPage * 10, storeTotalResults)} of {storeTotalResults} entries
                      </div>
                      <nav aria-label="Page navigation">
                        <ul className="flex flex-wrap items-center">
                          <li className={`page-item ${storeCurrentPage === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                              onClick={() => {
                                setStoreCurrentPage(prev => Math.max(prev - 1, 1));
                                fetchStores(Math.max(storeCurrentPage - 1, 1), storeSearchQuery);
                              }}
                              disabled={storeCurrentPage === 1}
                            >
                              Previous
                            </button>
                          </li>
                          {Array.from({ length: storeTotalPages }, (_, i) => i + 1).map(page => (
                            <li key={page} className="page-item">
                              <button
                                className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                  storeCurrentPage === page 
                                  ? 'bg-primary text-white hover:bg-primary-dark' 
                                  : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                }`}
                                onClick={() => {
                                  setStoreCurrentPage(page);
                                  fetchStores(page, storeSearchQuery);
                                }}
                              >
                                {page}
                              </button>
                            </li>
                          ))}
                          <li className={`page-item ${storeCurrentPage === storeTotalPages ? 'disabled' : ''}`}>
                            <button
                              className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                              onClick={() => {
                                setStoreCurrentPage(prev => Math.min(prev + 1, storeTotalPages));
                                fetchStores(Math.min(storeCurrentPage + 1, storeTotalPages), storeSearchQuery);
                              }}
                              disabled={storeCurrentPage === storeTotalPages}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t space-x-2">
              <button
                onClick={() => setShowStoreModal(false)}
                className="ti-btn ti-btn-light"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStoreSelection}
                className="ti-btn ti-btn-primary"
                disabled={!selectedStore}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditSalePage; 