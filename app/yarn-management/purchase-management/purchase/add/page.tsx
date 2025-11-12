"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import PurchaseForm from "../components/PurchaseForm";

interface PurchaseItem {
  id: string;
  yarnName: string;
  quantityPurchased: number;
  purchaseRate: number;
  invoiceNumber: string;
  batchLotNo: string;
  totalCost: number;
}

interface PurchaseData {
  purchaseDate: string;
  supplierName: string;
  items: PurchaseItem[];
  totalCost: number;
  notes: string;
}

const AddPurchasePage = () => {
  const router = useRouter();
  const { hasSubPermission } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to add purchase entries.</p>
          <Link href="/yarn-management/purchase-management/purchase" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: PurchaseData) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to add purchase entry
      console.log("Adding purchase entry:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Purchase entry added successfully');
      router.push('/yarn-management/purchase-management/purchase');
    } catch (error) {
      console.error('Failed to add purchase entry:', error);
      toast.error('Failed to add purchase entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/yarn-management/purchase-management/purchase');
  };

  return (
    <div className="main-content">
      <Seo title="Add Purchase Entry" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Add Purchase Entry</h1>
                <p className="text-gray-600 mt-1">Create a new yarn purchase entry</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/purchase-management/purchase" 
                  className="ti-btn ti-btn-secondary"
                  title="Back to Purchase"
                >
                  <i className="ri-arrow-left-line me-2"></i>
                  Back
                </Link>
              </div>
            </div>
          </div>

          {/* Form Container */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Purchase Entry Details</h3>
              <p className="text-sm text-gray-600 mt-1">
                Fill in the details below to create a new purchase entry. You can add multiple yarns in one purchase order.
                Fields marked with * are required.
              </p>
            </div>
            <div className="box-body">
              <PurchaseForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitButtonText="Add Purchase Entry"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPurchasePage;
