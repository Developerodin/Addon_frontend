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
  plannedEndDate?: string;
}

const EditOrderContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [formData, setFormData] = useState<EditOrderFormData>({
    orderPriority: 'Medium',
    articles: [],
    orderNote: '',
    plannedEndDate: ''
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
          orderNote: orderData.orderNote || '',
          plannedEndDate: orderData.plannedEndDate || ''
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

    // Validate planned end date if provided
    if (formData.plannedEndDate) {
      const endDate = new Date(formData.plannedEndDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (endDate < today) {
        newErrors.plannedEndDate = 'Planned end date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof EditOrderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
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
      setErrors(prev => ({
        ...prev,
        [errorKey]: undefined
      }));
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
        plannedEndDate: formData.plannedEndDate || undefined,
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
        orderNote: order.orderNote || '',
        plannedEndDate: order.plannedEndDate || ''
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
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Edit Production Order</h1>
                <HelpIcon
                  title="Edit Production Order"
                  content={
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                        <p className="text-gray-700">
                          This page allows you to edit an existing production order. You can update the order priority, notes, and planned end date.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What can you edit?</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Order Priority:</strong> Change the urgency level (Urgent, High, Medium, Low)</li>
                          <li><strong>Articles:</strong> Add, remove, or modify article details</li>
                          <li><strong>Article Number:</strong> 4-5 alphanumeric characters (e.g., ART001)</li>
                          <li><strong>Planned Quantity:</strong> Number of units to produce (1-100,000)</li>
                          <li><strong>Linking Type:</strong> Choose from Auto, Rosso, or Hand linking</li>
                          <li><strong>Article Priority:</strong> Set individual article priority</li>
                          <li><strong>Order Note:</strong> Update order-level instructions or notes</li>
                          <li><strong>Planned End Date:</strong> Modify the expected completion date</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-lg mb-2">Important Notes:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li>You can add or remove articles from the order</li>
                          <li>Article numbers must be unique and contain only uppercase letters and numbers</li>
                          <li>Order status and current floor are managed by the production process</li>
                          <li>Changes will be logged in the system audit trail</li>
                          <li>Planned end date cannot be set to a past date</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              </div>
              <div className="box-tools">
                <Link href="/production/supervisor" className="ti-btn ti-btn-secondary">
                  <i className="ri-arrow-left-line me-2"></i> Back to Dashboard
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
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                {/* Articles Section */}
                <div className="border-b pb-8 mb-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Articles ({formData.articles.length})</h3>
                    <button
                      type="button"
                      onClick={addArticle}
                      className="ti-btn ti-btn-primary ti-btn-sm"
                      title="Add Article"
                    >
                      <i className="ri-add-line"></i>
                    </button>
                  </div>

                  <div className="space-y-6">
                    {formData.articles.map((article, index) => (
                      <div key={article.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-md font-medium text-gray-700">Article {index + 1}</h4>
                          {formData.articles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeArticle(article.id)}
                              className="ti-btn ti-btn-danger ti-btn-sm"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Article Number */}
                          <div>
                            <label className="form-label">Article Number *</label>
                            <input
                              type="text"
                              className={`form-control ${errors[`article_${index}_number`] ? 'border-danger' : ''}`}
                              value={article.articleNumber}
                              onChange={(e) => handleArticleChange(index, 'articleNumber', e.target.value)}
                              placeholder="e.g., ART001"
                              maxLength={5}
                            />
                            {errors[`article_${index}_number`] && (
                              <div className="text-danger text-sm mt-1">{errors[`article_${index}_number`]}</div>
                            )}
                            <div className="text-muted text-sm mt-1">4-5 alphanumeric characters</div>
                          </div>

                          {/* Planned Quantity */}
                          <div>
                            <label className="form-label">Planned Quantity *</label>
                            <input
                              type="number"
                              className={`form-control ${errors[`article_${index}_quantity`] ? 'border-danger' : ''}`}
                              value={article.plannedQuantity}
                              onChange={(e) => handleArticleChange(index, 'plannedQuantity', Number(e.target.value))}
                              placeholder="0"
                              min="1"
                              max="100000"
                            />
                            {errors[`article_${index}_quantity`] && (
                              <div className="text-danger text-sm mt-1">{errors[`article_${index}_quantity`]}</div>
                            )}
                            <div className="text-muted text-sm mt-1">Number of units (1-100,000)</div>
                          </div>

                          {/* Linking Type */}
                          <div>
                            <label className="form-label">Linking Type *</label>
                            <select
                              className="form-select"
                              value={article.linkingType}
                              onChange={(e) => handleArticleChange(index, 'linkingType', e.target.value as 'Auto Linking' | 'Rosso Linking' | 'Hand Linking')}
                            >
                              <option value="Auto Linking">Auto Linking</option>
                              <option value="Rosso Linking">Rosso Linking</option>
                              <option value="Hand Linking">Hand Linking</option>
                            </select>
                            <div className="text-muted text-sm mt-1">Select linking type</div>
                          </div>

                          {/* Priority */}
                          <div>
                            <label className="form-label">Priority *</label>
                            <select
                              className="form-select"
                              value={article.priority}
                              onChange={(e) => handleArticleChange(index, 'priority', e.target.value as 'Urgent' | 'High' | 'Medium' | 'Low')}
                            >
                              <option value="Urgent">Urgent</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                            <div className="text-muted text-sm mt-1">Set article priority</div>
                          </div>
                        </div>

                        {/* Article Remarks */}
                        <div className="mt-4">
                          <label className="form-label">Article Remarks (optional)</label>
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Add article-specific remarks..."
                            value={article.remarks || ''}
                            onChange={(e) => handleArticleChange(index, 'remarks', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Level Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order Priority */}
                  <div>
                    <label className="form-label">Order Priority *</label>
                    <select
                      className="form-select"
                      value={formData.orderPriority}
                      onChange={(e) => handleInputChange('orderPriority', e.target.value as 'Urgent' | 'High' | 'Medium' | 'Low')}
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    <div className="text-muted text-sm mt-1">Sets the urgency level for the whole order</div>
                  </div>

                  {/* Planned End Date */}
                  <div>
                    <label className="form-label">Planned End Date</label>
                    <input
                      type="date"
                      className={`form-control ${errors.plannedEndDate ? 'border-danger' : ''}`}
                      value={formData.plannedEndDate}
                      onChange={(e) => handleInputChange('plannedEndDate', e.target.value)}
                    />
                    {errors.plannedEndDate && (
                      <div className="text-danger text-sm mt-1">{errors.plannedEndDate}</div>
                    )}
                    <div className="text-muted text-sm mt-1">Expected completion date (optional)</div>
                  </div>
                </div>

                {/* Order Note */}
                <div className="mt-6">
                  <label className="form-label">Order Note</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Add any order-level instructions or notes..."
                    value={formData.orderNote || ''}
                    onChange={(e) => handleInputChange('orderNote', e.target.value)}
                  />
                  <div className="text-muted text-sm mt-1">Optional notes or instructions for this order</div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-6 border-t mt-8">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="ti-btn ti-btn-light"
                      onClick={handleReset}
                    >
                      <i className="ri-refresh-line me-2"></i>
                      Reset Changes
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <Link
                      href="/production/supervisor"
                      className="ti-btn ti-btn-secondary"
                    >
                      <i className="ri-close-line me-2"></i>
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2"></div>
                          Updating Order...
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line me-2"></i>
                          Update Order
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
