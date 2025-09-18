"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { productionService, CreateOrderRequest } from "@/shared/services/productionService";
import { API_BASE_URL } from "@/shared/data/utilities/api";

interface Article {
  id: string;
  articleNumber: string;
  plannedQuantity: number;
  linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  machineId?: string;
  remarks?: string;
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
        remarks: ''
      }
    ],
    orderNote: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoadingMachines, setIsLoadingMachines] = useState(true);

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
      setMachines(machinesArray);
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast.error('Failed to load machines');
    } finally {
      setIsLoadingMachines(false);
    }
  };

  // Fetch machines on component mount
  React.useEffect(() => {
    fetchMachines();
  }, []);

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

    setIsSubmitting(true);
    
    try {
      const orderData: CreateOrderRequest = {
        priority: formData.orderPriority,
        articles: formData.articles.map(article => ({
          articleNumber: article.articleNumber,
          plannedQuantity: article.plannedQuantity,
          linkingType: article.linkingType,
          priority: article.priority
          // Note: machineId is intentionally excluded from order creation
        })),
        orderNote: formData.orderNote || undefined
      };

      const response = await productionService.createOrder(orderData);
      
      if (response.success) {
        toast.success('Production order created successfully!');
        router.push('/production/supervisor');
      } else {
        toast.error(response.error?.message || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
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
          machineId: '',
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
      
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none mb-4">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-xl font-semibold">Add New Production Order</h1>
                <HelpIcon
                  title="Add New Production Order"
                  content={
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-base mb-1">What is this page?</h4>
                        <p className="text-gray-700 text-sm">
                          Create a new production order with article details and specifications.
                        </p>
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
              <div className="box-tools">
                <Link href="/production/supervisor" className="ti-btn ti-btn-secondary ti-btn-sm">
                  <i className="ri-arrow-left-line me-1"></i> Back
                </Link>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="box">
            <div className="box-body p-4">
              <form onSubmit={handleSubmit}>
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
                    <label className="form-label text-sm">Order Note (optional)</label>
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
                              <input
                                type="text"
                                className="form-control form-control-sm w-full text-xs py-1 px-2 h-8"
                                value={article.articleNumber}
                                onChange={(e) => handleArticleChange(index, 'articleNumber', e.target.value)}
                                placeholder="ART001"
                              />
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
                              <select
                                className="form-select form-select-sm w-full text-xs py-1 px-2 h-8"
                                value={article.machineId || ''}
                                onChange={(e) => handleArticleChange(index, 'machineId', e.target.value)}
                                disabled={isLoadingMachines}
                              >
                                <option value="">Select Machine</option>
                                {machines.map((machine) => (
                                  <option key={machine._id || machine.id} value={machine._id || machine.id}>
                                    {machine.machineCode}
                                  </option>
                                ))}
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
                <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t mt-6 gap-4" >
                  <button
                    type="button"
                    className="ti-btn ti-btn-light ti-btn-w-sm flex items-center gap-2 w-full sm:w-auto"
                    onClick={handleReset}
                  >
                    <i className="ri-refresh-line text-sm"></i>
                    <span>Reset</span>
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
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <i className="ri-add-line text-sm"></i>
                          <span>Create Order</span>
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
