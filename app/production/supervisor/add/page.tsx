"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";

interface Article {
  id: string;
  articleNumber: string;
  plannedQuantity: number;
  linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  remarks?: string;
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
        remarks: ''
      }
    ],
    orderNote: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // No order-level validations

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // No order-level inputs; all editing happens within articles

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

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would typically make an API call to create the order
      console.log('Creating order:', formData);
      
      toast.success('Production order created successfully!');
      router.push('/production/supervisor');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create order');
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
          remarks: ''
        }
      ],
      orderNote: ''
    });
    setErrors({});
  };

  return (
    <div className="main-content">
      <Seo title="Add New Production Order"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Add New Production Order</h1>
                <HelpIcon
                  title="Add New Production Order"
                  content={
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                        <p className="text-gray-700">
                          This page allows you to create a new production order by filling out comprehensive order information including article details, production specifications, and scheduling.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Required Fields:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Order Priority:</strong> Urgent, High, Medium, or Low</li>
                          <li><strong>Article Number:</strong> 4-5 alphanumeric characters (e.g., ART001)</li>
                          <li><strong>Planned Quantity:</strong> Number of units to produce (1-100,000)</li>
                          <li><strong>Linking Type:</strong> Choose from Auto, Rosso, or Hand linking</li>
                          <li><strong>Priority (per article):</strong> Urgent, High, Medium, or Low</li>
                          <li><strong>Multiple Articles:</strong> Add multiple articles to the same order</li>
                        </ul>
                      </div>

                      {/* No optional order-level fields currently */}

                      <div>
                        <h4 className="font-semibold text-lg mb-2">Tips:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li>Article numbers must be unique and contain only uppercase letters and numbers</li>
                          <li>Planned quantity should be realistic based on production capacity</li>
                          <li>Set appropriate priority based on customer requirements</li>
                          <li>Choose the correct linking type based on product specifications</li>
                          {/* Floor selection removed; priority is now per article */}
                          <li>Use "Add Article" button to add multiple articles to the same order</li>
                          <li>Each article can have different quantities and linking types</li>
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

          {/* Form */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                {/* Overall Order Priority + Order Note */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="lg:col-span-1">
                    <label className="form-label">Order Priority *</label>
                    <select
                      className="form-select"
                      value={formData.orderPriority}
                      onChange={(e) => setFormData(prev => ({ ...prev, orderPriority: e.target.value as 'Urgent' | 'High' | 'Medium' | 'Low' }))}
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    <div className="text-muted text-sm mt-1">Sets the default urgency for the whole order</div>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="form-label">Order Note (optional)</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Add any order-level instructions or notes..."
                      value={formData.orderNote || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, orderNote: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Articles Section */}
                <div className="border-t pt-8">
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

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-6 border-t mt-8">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="ti-btn ti-btn-light"
                      onClick={handleReset}
                    >
                      <i className="ri-refresh-line me-2"></i>
                      Reset Form
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
                          Creating Order...
                        </>
                      ) : (
                        <>
                          <i className="ri-add-line me-2"></i>
                          Create Order
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

export default AddOrderPage;
