"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface YarnIssue {
  id: string;
  issueNumber: string;
  issueDate: string;
  floor: string;
  productionOrder?: string;
  status: 'Pending' | 'Issued' | 'Received' | 'Cancelled';
  items: IssueItem[];
  issuedBy: string;
  receivedBy?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface IssueItem {
  id: string;
  yarnCode: string;
  yarnName: string;
  yarnType: string;
  bomQuantity: number;
  requestedQuantity: number;
  issuedQuantity: number;
  unitPrice: number;
  totalValue: number;
  remarks?: string;
}

interface EditYarnIssuePageProps {
  params: {
    issueId: string;
  };
}

const EditYarnIssuePage: React.FC<EditYarnIssuePageProps> = ({ params }) => {
  const router = useRouter();
  const { hasSubPermission } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [issueData, setIssueData] = useState<YarnIssue | null>(null);
  const [items, setItems] = useState<IssueItem[]>([]);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management', 'Yarn Issue');

  const floors = [
    'Knitting Floor',
    'Linking Floor', 
    'Checking Floor',
    'Washing Floor',
    'Boarding Floor',
    'Branding Floor',
    'Final Checking Floor',
    'Machine Floor',
    'Warehouse Floor'
  ];

  const yarnTypes = [
    'Cotton',
    'Polyester',
    'Viscose',
    'Nylon',
    'Wool',
    'Silk',
    'Linen',
    'Blend',
    'Other'
  ];

  useEffect(() => {
    const fetchIssueData = async () => {
      try {
        // TODO: Implement API call to fetch issue data
        // For now, using mock data
        const mockData: YarnIssue = {
          id: params.issueId,
          issueNumber: "YI-2024-001",
          issueDate: "2024-01-15",
          floor: "Knitting Floor",
          productionOrder: "PO-2024-001",
          status: "Issued",
          items: [
            {
              id: "1",
              yarnCode: "COT-001",
              yarnName: "Cotton Yarn Premium",
              yarnType: "Cotton",
              bomQuantity: 100,
              requestedQuantity: 100,
              issuedQuantity: 95,
              unitPrice: 250,
              totalValue: 23750,
              remarks: "High quality cotton"
            }
          ],
          issuedBy: "John Doe",
          receivedBy: "Jane Smith",
          notes: "Urgent production requirement",
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-15T10:00:00Z"
        };
        
        setIssueData(mockData);
        setItems(mockData.items);
      } catch (error) {
        console.error('Failed to fetch issue data:', error);
        toast.error('Failed to load issue data');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.issueId) {
      fetchIssueData();
    }
  }, [params.issueId]);

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to edit yarn issues.</p>
          <Link href="/yarn-management/yarn-issue" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Issue
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-loader-4-line animate-spin text-4xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading...</h3>
          <p className="text-gray-500">Please wait while we load the issue data.</p>
        </div>
      </div>
    );
  }

  if (!issueData) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-error-warning-line text-4xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Issue Not Found</h3>
          <p className="text-gray-500 mb-4">The requested yarn issue could not be found.</p>
          <Link href="/yarn-management/yarn-issue" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Issue
          </Link>
        </div>
      </div>
    );
  }

  const addItem = () => {
    const newItem: IssueItem = {
      id: Date.now().toString(),
      yarnCode: '',
      yarnName: '',
      yarnType: '',
      bomQuantity: 0,
      requestedQuantity: 0,
      issuedQuantity: 0,
      unitPrice: 0,
      totalValue: 0,
      remarks: ''
    };
    setItems([...items, newItem]);
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof IssueItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'issuedQuantity' || field === 'unitPrice') {
          updatedItem.totalValue = updatedItem.issuedQuantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      const updatedIssueData: YarnIssue = {
        ...issueData,
        issueNumber: formData.get('issueNumber') as string,
        issueDate: formData.get('issueDate') as string,
        floor: formData.get('floor') as string,
        productionOrder: formData.get('productionOrder') as string,
        status: formData.get('status') as YarnIssue['status'],
        items: items.filter(item => item.yarnCode && item.yarnName),
        issuedBy: formData.get('issuedBy') as string,
        receivedBy: formData.get('receivedBy') as string,
        notes: formData.get('notes') as string,
        updatedAt: new Date().toISOString()
      };

      // TODO: Implement API call to update yarn issue
      console.log("Updating yarn issue:", updatedIssueData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Yarn issue updated successfully');
      router.push('/yarn-management/yarn-issue');
    } catch (error) {
      console.error('Failed to update yarn issue:', error);
      toast.error('Failed to update yarn issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/yarn-management/yarn-issue');
  };

  const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);

  return (
    <div className="main-content">
      <Seo title="Edit Yarn Issue" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Edit Yarn Issue</h1>
                <p className="text-gray-600 mt-1">Update yarn issue information</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/yarn-issue" 
                  className="ti-btn ti-btn-secondary"
                  title="Back to Yarn Issue"
                >
                  <i className="ri-arrow-left-line me-2"></i>
                  Back
                </Link>
              </div>
            </div>
          </div>

          {/* Form Container */}
          <form onSubmit={handleSubmit}>
            <div className="box">
              <div className="box-header">
                <h3 className="box-title">Issue Details</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Update the details below to modify the yarn issue. Fields marked with * are required.
                </p>
              </div>
              <div className="box-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Issue Number */}
                  <div>
                    <label className="form-label">
                      Issue Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="issueNumber"
                      className="form-control"
                      defaultValue={issueData.issueNumber}
                      required
                    />
                  </div>

                  {/* Floor */}
                  <div>
                    <label className="form-label">
                      Floor <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="floor"
                      className="form-control"
                      defaultValue={issueData.floor}
                      required
                    >
                      <option value="">Select Floor</option>
                      {floors.map(floor => (
                        <option key={floor} value={floor}>{floor}</option>
                      ))}
                    </select>
                  </div>

                  {/* Issue Date */}
                  <div>
                    <label className="form-label">
                      Issue Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="issueDate"
                      className="form-control"
                      defaultValue={issueData.issueDate}
                      required
                    />
                  </div>

                  {/* Production Order */}
                  <div>
                    <label className="form-label">Production Order</label>
                    <input
                      type="text"
                      name="productionOrder"
                      className="form-control"
                      defaultValue={issueData.productionOrder || ''}
                      placeholder="Optional production order reference"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="form-label">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="status"
                      className="form-control"
                      defaultValue={issueData.status}
                      required
                    >
                      <option value="Pending">Pending</option>
                      <option value="Issued">Issued</option>
                      <option value="Received">Received</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Issued By */}
                  <div>
                    <label className="form-label">
                      Issued By <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="issuedBy"
                      className="form-control"
                      defaultValue={issueData.issuedBy}
                      required
                    />
                  </div>

                  {/* Received By */}
                  <div>
                    <label className="form-label">Received By</label>
                    <input
                      type="text"
                      name="receivedBy"
                      className="form-control"
                      defaultValue={issueData.receivedBy || ''}
                      placeholder="Enter receiver name"
                    />
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="form-label">Notes</label>
                    <textarea
                      name="notes"
                      className="form-control"
                      rows={3}
                      defaultValue={issueData.notes}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="box">
              <div className="box-header">
                <h3 className="box-title">Issue Items</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Update yarn items to be issued. BOM quantities will be auto-filled from the Bill of Materials.
                </p>
              </div>
              <div className="box-body">
                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 p-4 border rounded-lg">
                    <div>
                      <label className="form-label">Yarn Code *</label>
                      <input
                        type="text"
                        value={item.yarnCode}
                        onChange={(e) => updateItem(item.id, 'yarnCode', e.target.value)}
                        className="form-control"
                        placeholder="e.g., COT-001"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Yarn Name *</label>
                      <input
                        type="text"
                        value={item.yarnName}
                        onChange={(e) => updateItem(item.id, 'yarnName', e.target.value)}
                        className="form-control"
                        placeholder="Enter yarn name"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Yarn Type *</label>
                      <select
                        value={item.yarnType}
                        onChange={(e) => updateItem(item.id, 'yarnType', e.target.value)}
                        className="form-control"
                        required
                      >
                        <option value="">Select Type</option>
                        {yarnTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">BOM Quantity *</label>
                      <input
                        type="number"
                        value={item.bomQuantity}
                        onChange={(e) => updateItem(item.id, 'bomQuantity', parseFloat(e.target.value) || 0)}
                        className="form-control"
                        step="0.01"
                        min="0"
                        placeholder="Auto-filled from BOM"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Issued Quantity *</label>
                      <input
                        type="number"
                        value={item.issuedQuantity}
                        onChange={(e) => updateItem(item.id, 'issuedQuantity', parseFloat(e.target.value) || 0)}
                        className="form-control"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Unit Price (₹) *</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="form-control"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div className="md:col-span-5">
                      <label className="form-label">Remarks</label>
                      <input
                        type="text"
                        value={item.remarks || ''}
                        onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                        className="form-control"
                        placeholder="Optional remarks"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="ti-btn ti-btn-danger w-full"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </div>
                    <div className="md:col-span-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-blue-800">Item Total Value:</span>
                          <span className="text-lg font-bold text-blue-900">
                            ₹{item.totalValue.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Calculated as: {item.issuedQuantity} × ₹{item.unitPrice}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addItem}
                  className="ti-btn ti-btn-light mb-4"
                >
                  <i className="ri-add-line me-1"></i>
                  Add Item
                </button>

                {/* Total Value Display */}
                {items.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800">Total Issue Value:</span>
                      <span className="text-lg font-bold text-green-900">
                        ₹{totalValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Sum of all item values
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="box">
              <div className="box-body">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="ti-btn ti-btn-light"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isSubmitting || items.length === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin me-2"></i>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line me-2"></i>
                        Update Issue
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditYarnIssuePage;
