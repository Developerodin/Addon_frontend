"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { productionService, ProductionOrder, UpdateOrderRequest } from "@/shared/services/productionService";

interface Article {
  id: string;
  articleNumber: string;
  plannedQuantity: number;
  linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  remarks?: string;
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

  // Load order data
  useEffect(() => {
    if (orderId) {
      loadOrder();
    } else {
      toast.error('Order ID is required');
      router.push('/production/supervisor');
    }
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;
    
    setIsLoading(true);
    try {
      const response = await productionService.getOrder(orderId);
      
      if (response.success) {
        const orderData = response.data;
        setOrder(orderData);
        setFormData({
          orderPriority: orderData.priority,
          articles: orderData.articles.map(article => ({
            id: article.id,
            articleNumber: article.articleNumber,
            plannedQuantity: article.plannedQuantity,
            linkingType: article.linkingType,
            priority: article.priority,
            remarks: article.remarks || ''
          })),
          orderNote: orderData.orderNote || ''
        });
      } else {
        console.error('Failed to load order:', response.error);
        toast.error('Failed to load order');
        router.push('/production/supervisor');
      }
    } catch (error: any) {
      console.error('Error loading order:', error);
      toast.error(error.message || 'Failed to load order');
      router.push('/production/supervisor');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Validate articles
    formData.articles.forEach((article, index) => {
      if (!article.articleNumber.trim()) {
        newErrors[`article_${index}_number`] = 'Article Number is required';
      } else if (!/^[A-Z0-9]{4,5}$/.test(article.articleNumber)) {
        newErrors[`article_${index}_number`] = 'Article Number must be 4-5 alphanumeric characters';
      }

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
      articles: prev.articles.map((article, index) => 
        index === articleIndex 
          ? { ...article, [field]: value }
          : article
      )
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

  const addArticle = () => {
    const newArticle: Article = {
      id: String(Date.now()),
      articleNumber: '',
      plannedQuantity: 0,
      linkingType: 'Auto Linking',
      priority: 'Medium',
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
          id: article.id,
          articleNumber: article.articleNumber,
          plannedQuantity: article.plannedQuantity,
          linkingType: article.linkingType,
          priority: article.priority,
          remarks: article.remarks
        }))
      };

      const response = await productionService.updateOrder(orderId, updateData);
      
      if (response.success) {
        toast.success('Production order updated successfully!');
        router.push('/production/supervisor');
      } else {
        toast.error(response.error?.message || 'Failed to update order');
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error(error.message || 'Failed to update order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (order) {
      setFormData({
        orderPriority: order.priority,
        articles: order.articles.map(article => ({
          id: article.id,
          articleNumber: article.articleNumber,
          plannedQuantity: article.plannedQuantity,
          linkingType: article.linkingType,
          priority: article.priority,
          remarks: article.remarks || ''
        })),
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
                          <th className="w-40 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                          <th className="w-16 px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.articles.map((article, index) => (
                          <tr key={article.id} className="hover:bg-gray-50">
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                className={`form-control form-control-sm w-full text-xs py-1 px-2 h-8 ${errors[`article_${index}_number`] ? 'border-danger' : ''}`}
                                value={article.articleNumber}
                                onChange={(e) => handleArticleChange(index, 'articleNumber', e.target.value)}
                                placeholder="ART001"
                                maxLength={5}
                              />
                              {errors[`article_${index}_number`] && (
                                <div className="text-danger text-xs mt-1 truncate">{errors[`article_${index}_number`]}</div>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                className={`form-control form-control-sm w-full text-xs py-1 px-2 h-8 ${errors[`article_${index}_quantity`] ? 'border-danger' : ''}`}
                                value={article.plannedQuantity}
                                onChange={(e) => handleArticleChange(index, 'plannedQuantity', Number(e.target.value))}
                                placeholder="0"
                                min="1"
                                max="100000"
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
