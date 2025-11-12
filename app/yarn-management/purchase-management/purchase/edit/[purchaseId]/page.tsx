"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import PurchaseForm, { PurchaseOrderData } from "../../components/PurchaseForm";

const EditPurchasePage = () => {
  const router = useRouter();
  const params = useParams();
  const purchaseId = params?.purchaseId as string;
  const { hasSubPermission, isLoading: isLoadingPermissions } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseData, setPurchaseData] = useState<PurchaseOrderData | null>(null);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');

  useEffect(() => {
    const fetchPurchaseData = async () => {
      if (!purchaseId) return;
      
      setIsLoading(true);
      try {
        // TODO: Implement API call to fetch purchase data
        // For now, using mock data that matches the new structure
        const mockData: PurchaseOrderData = {
          purchaseDate: "2024-01-15",
          supplierId: "supplier-1",
          supplierName: "Reliance Industries",
          status: "submitted to supplier",
          items: [
            {
              id: "1",
              yarnName: "Cotton Count 40",
              yarnTypeId: "type-1",
              yarnSubtypeId: "subtype-1",
              sizeCount: "40",
              shadeCode: "SH001",
              rate: 400,
              qty: 100,
              estimatedDeliveryDate: "2024-01-25",
              gst: 18,
              subTotal: 47200
            },
            {
              id: "2",
              yarnName: "Polyester DTY 150",
              yarnTypeId: "type-2",
              yarnSubtypeId: "subtype-2",
              sizeCount: "150",
              shadeCode: "SH002",
              rate: 320,
              qty: 50,
              estimatedDeliveryDate: "2024-01-26",
              gst: 18,
              subTotal: 18880
            }
          ],
          subTotal: 60000,
          totalGst: 10800,
          total: 70800,
          notes: "Bulk purchase for Q1 production"
        };
        
        setPurchaseData(mockData);
      } catch (error) {
        console.error('Failed to fetch purchase data:', error);
        toast.error('Failed to load purchase data');
      } finally {
        setIsLoading(false);
      }
    };

    if (purchaseId) {
      fetchPurchaseData();
    }
  }, [purchaseId]);

  if (isLoadingPermissions) {
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
          <p className="text-gray-500 mb-4">You don't have permission to edit purchase orders.</p>
          <Link href="/yarn-management/purchase-management/purchase" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase Orders
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
          <p className="text-gray-500">Please wait while we load the purchase order data.</p>
        </div>
      </div>
    );
  }

  if (!purchaseData) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-error-warning-line text-4xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase Order Not Found</h3>
          <p className="text-gray-500 mb-4">The requested purchase order could not be found.</p>
          <Link href="/yarn-management/purchase-management/purchase" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: PurchaseOrderData) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to update purchase order
      console.log("Updating purchase order:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Purchase order updated successfully');
      router.push('/yarn-management/purchase-management/purchase');
    } catch (error) {
      console.error('Failed to update purchase order:', error);
      toast.error('Failed to update purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/yarn-management/purchase-management/purchase');
  };

  return (
    <div className="main-content">
      <Seo title="Edit Purchase Order" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Edit Purchase Order</h1>
                <p className="text-gray-600 mt-1">Update yarn purchase order information</p>
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
                Update the details below to modify the purchase order. You can add, remove, or modify yarn items.
                Fields marked with * are required.
              </p>
            </div>
            <div className="box-body">
              <PurchaseForm
                initialData={purchaseData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitButtonText="Update Purchase Order"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPurchasePage;
