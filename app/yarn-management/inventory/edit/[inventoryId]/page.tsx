"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import InventoryForm from "../../components/InventoryForm";

interface InventoryData {
  yarnName: string;
  yarnType: string;
  countDenier: string;
  color: string;
  lotNo: string;
  supplier: string;
  openingBalance: number;
  purchasedQuantity: number;
  issuedQuantity: number;
  closingBalance: number;
  unitOfMeasurement: string;
  ratePerUnit: number;
  minimumStock: number;
  location: string;
  remarks: string;
}

interface EditInventoryPageProps {
  params: {
    inventoryId: string;
  };
}

const EditInventoryPage: React.FC<EditInventoryPageProps> = ({ params }) => {
  const router = useRouter();
  const { hasSubPermission } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management', 'Inventory');

  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        // TODO: Implement API call to fetch inventory data
        // For now, using mock data
        const mockData: InventoryData = {
          yarnName: "Premium Cotton Yarn",
          yarnType: "Cotton",
          countDenier: "30s",
          color: "#ffffff",
          lotNo: "COT-2024-001",
          supplier: "Textile Mills Ltd",
          openingBalance: 1000,
          purchasedQuantity: 500,
          issuedQuantity: 300,
          closingBalance: 1200,
          unitOfMeasurement: "kg",
          ratePerUnit: 250,
          minimumStock: 200,
          location: "Warehouse A",
          remarks: "High quality cotton yarn"
        };
        
        setInventoryData(mockData);
      } catch (error) {
        console.error('Failed to fetch inventory data:', error);
        toast.error('Failed to load inventory data');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.inventoryId) {
      fetchInventoryData();
    }
  }, [params.inventoryId]);

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to edit inventory records.</p>
          <Link href="/yarn-management/inventory" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Inventory
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
          <p className="text-gray-500">Please wait while we load the inventory data.</p>
        </div>
      </div>
    );
  }

  if (!inventoryData) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-error-warning-line text-4xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Inventory Not Found</h3>
          <p className="text-gray-500 mb-4">The requested inventory record could not be found.</p>
          <Link href="/yarn-management/inventory" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: InventoryData) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to update inventory
      console.log("Updating inventory:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Inventory record updated successfully');
      router.push('/yarn-management/inventory');
    } catch (error) {
      console.error('Failed to update inventory:', error);
      toast.error('Failed to update inventory record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/yarn-management/inventory');
  };

  return (
    <div className="main-content">
      <Seo title="Edit Inventory Record" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Edit Inventory Record</h1>
                <p className="text-gray-600 mt-1">Update yarn inventory information</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/inventory" 
                  className="ti-btn ti-btn-secondary"
                  title="Back to Inventory"
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
              <h3 className="box-title">Inventory Details</h3>
              <p className="text-sm text-gray-600 mt-1">
                Update the details below to modify the inventory record. Fields marked with * are required.
              </p>
            </div>
            <div className="box-body">
              <InventoryForm
                initialData={inventoryData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitButtonText="Update Inventory"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditInventoryPage;
