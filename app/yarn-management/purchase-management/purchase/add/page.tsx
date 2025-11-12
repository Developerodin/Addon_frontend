"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import PurchaseForm, { PurchaseOrderData } from "../components/PurchaseForm";

const AddPurchasePage = () => {
  const router = useRouter();
  const { hasSubPermission, isLoading } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to add purchase orders.</p>
          <Link href="/yarn-management/purchase-management/purchase" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: PurchaseOrderData) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to create purchase order
      console.log("Creating purchase order:", data);
      
      // Generate order number
      const orderNumber = `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      
      const orderData = {
        ...data,
        orderNumber,
        status: 'submitted to supplier' as const
      };
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Purchase order created successfully');
      router.push('/yarn-management/purchase-management/purchase');
    } catch (error) {
      console.error('Failed to create purchase order:', error);
      toast.error('Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/yarn-management/purchase-management/purchase');
  };

  return (
    <div className="main-content">
      <Seo title="Add Purchase Order" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Add Purchase Order</h1>
                <p className="text-gray-600 mt-1">Create a new yarn purchase order</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/purchase-management/purchase" 
                  className="ti-btn ti-btn-secondary"
                  title="Back to Purchase Orders"
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
              <h3 className="box-title">Purchase Order Details</h3>
              <p className="text-sm text-gray-600 mt-1">
                Fill in the details below to create a new purchase order. You can add multiple yarn items in one purchase order.
                Fields marked with * are required. The order will be saved as "submitted to supplier" by default.
              </p>
            </div>
            <div className="box-body">
              <PurchaseForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitButtonText="Submit to Supplier"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPurchasePage;
