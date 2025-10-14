"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import InventoryForm from "../components/InventoryForm";

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

const AddInventoryPage = () => {
  const router = useRouter();
  const { hasSubPermission } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management', 'Inventory');

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to add inventory records.</p>
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
      // TODO: Implement API call to add inventory
      console.log("Adding inventory:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Inventory record added successfully');
      router.push('/yarn-management/inventory');
    } catch (error) {
      console.error('Failed to add inventory:', error);
      toast.error('Failed to add inventory record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/yarn-management/inventory');
  };

  return (
    <div className="main-content">
      <Seo title="Add Inventory Record" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Add Inventory Record</h1>
                <p className="text-gray-600 mt-1">Create a new yarn inventory entry</p>
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
                Fill in the details below to create a new inventory record. Fields marked with * are required.
              </p>
            </div>
            <div className="box-body">
              <InventoryForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitButtonText="Add Inventory"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddInventoryPage;
