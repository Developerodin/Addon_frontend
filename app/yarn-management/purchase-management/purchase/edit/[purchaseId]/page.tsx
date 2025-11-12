"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import PurchaseForm from "../../components/PurchaseForm";

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

interface EditPurchasePageProps {
  params: {
    purchaseId: string;
  };
}

const EditPurchasePage: React.FC<EditPurchasePageProps> = ({ params }) => {
  const router = useRouter();
  const { hasSubPermission } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');

  useEffect(() => {
    const fetchPurchaseData = async () => {
      try {
        // TODO: Implement API call to fetch purchase data
        // For now, using mock data
        const mockData: PurchaseData = {
          purchaseDate: "2024-01-15",
          supplierName: "ABC Textiles Ltd",
          items: [
            {
              id: "1",
              yarnName: "Premium Cotton Yarn",
              quantityPurchased: 100,
              purchaseRate: 250,
              invoiceNumber: "INV001",
              batchLotNo: "LOT001",
              totalCost: 25000
            },
            {
              id: "2",
              yarnName: "Polyester Blend Yarn",
              quantityPurchased: 50,
              purchaseRate: 180,
              invoiceNumber: "INV001",
              batchLotNo: "LOT002",
              totalCost: 9000
            }
          ],
          totalCost: 34000,
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

    if (params.purchaseId) {
      fetchPurchaseData();
    }
  }, [params.purchaseId]);

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to edit purchase entries.</p>
          <Link href="/yarn-management/purchase-management/purchase" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase
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
          <p className="text-gray-500">Please wait while we load the purchase data.</p>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase Entry Not Found</h3>
          <p className="text-gray-500 mb-4">The requested purchase entry could not be found.</p>
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
      // TODO: Implement API call to update purchase entry
      console.log("Updating purchase entry:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Purchase entry updated successfully');
      router.push('/yarn-management/purchase-management/purchase');
    } catch (error) {
      console.error('Failed to update purchase entry:', error);
      toast.error('Failed to update purchase entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/yarn-management/purchase-management/purchase');
  };

  return (
    <div className="main-content">
      <Seo title="Edit Purchase Entry" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Edit Purchase Entry</h1>
                <p className="text-gray-600 mt-1">Update yarn purchase information</p>
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
                Update the details below to modify the purchase entry. You can add, remove, or modify yarn items.
                Fields marked with * are required.
              </p>
            </div>
            <div className="box-body">
              <PurchaseForm
                initialData={purchaseData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitButtonText="Update Purchase Entry"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPurchasePage;
