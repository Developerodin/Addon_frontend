"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import YarnForm from "../components/YarnForm";

interface YarnData {
  yarnName: string;
  yarnType: string;
  countDenier: string;
  color: string;
  lotNo: string;
  supplier: string;
  unitOfMeasurement: string;
  ratePerUnit: number;
  remarks: string;
  referenceDocuments?: File[];
}

const AddYarnPage = () => {
  const router = useRouter();
  const { hasSubPermission } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management', 'Cataloguing');

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to add yarn specifications.</p>
          <Link href="/yarn-management/cataloguing" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Cataloguing
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: YarnData) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to add yarn
      console.log("Adding yarn:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Yarn specification added successfully');
      router.push('/yarn-management/cataloguing');
    } catch (error) {
      console.error('Failed to add yarn:', error);
      toast.error('Failed to add yarn specification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/yarn-management/cataloguing');
  };

  return (
    <div className="main-content">
      <Seo title="Add Yarn Specification" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Add Yarn Specification</h1>
                <p className="text-gray-600 mt-1">Create a new yarn specification entry</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/cataloguing" 
                  className="ti-btn ti-btn-secondary "
                  title="Back to Cataloguing"
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
              <h3 className="box-title">Yarn Details</h3>
              <p className="text-sm text-gray-600 mt-1">
                Fill in the details below to create a new yarn specification. Fields marked with * are required.
              </p>
            </div>
            <div className="box-body">
              <YarnForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitButtonText="Add Yarn"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddYarnPage;
