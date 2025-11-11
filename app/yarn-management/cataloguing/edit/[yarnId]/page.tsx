"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast, Toaster } from "react-hot-toast";
import YarnForm from "../../components/YarnForm";
import yarnCatalogService, { UpdateYarnCatalogRequest, YarnCatalog } from "@/shared/services/yarnCatalogService";

const EditYarnPage = () => {
  const router = useRouter();
  const params = useParams();
  const { hasSubPermission } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [yarnData, setYarnData] = useState<YarnCatalog | null>(null);

  const yarnId = params.yarnId as string;

  const hasPermission = hasSubPermission('/yarn-management', 'Cataloguing');

  useEffect(() => {
    const fetchYarnData = async () => {
      if (!yarnId) return;
      
      setIsLoading(true);
      try {
        const data = await yarnCatalogService.getYarnCatalogById(yarnId);
        setYarnData(data);
      } catch (error) {
        console.error('Failed to fetch yarn catalog:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load yarn catalog');
        router.push('/yarn-management/cataloguing');
      } finally {
        setIsLoading(false);
      }
    };

    if (yarnId && hasPermission) {
      fetchYarnData();
    }
  }, [yarnId, router, hasPermission]);

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to edit yarn specifications.</p>
          <Link href="/yarn-management/cataloguing" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Cataloguing
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
          <p className="text-gray-500">Please wait while we load the yarn data.</p>
        </div>
      </div>
    );
  }

  if (!yarnData) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-error-warning-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Yarn Not Found</h3>
          <p className="text-gray-500 mb-4">The requested yarn specification could not be found.</p>
          <Link href="/yarn-management/cataloguing" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Cataloguing
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: UpdateYarnCatalogRequest) => {
    if (!yarnId) return;
    
    setIsSubmitting(true);
    try {
      await yarnCatalogService.updateYarnCatalog(yarnId, data);
      toast.success('Yarn catalog updated successfully');
      router.push('/yarn-management/cataloguing');
    } catch (error) {
      console.error('Failed to update yarn catalog:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update yarn catalog');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title={`Edit Yarn Catalog: ${yarnData?.yarnName || ''}`} />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Edit Yarn Catalog</h1>
                <p className="text-gray-600 mt-1">Update yarn catalog details</p>
                {yarnData && (
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    {yarnData.createdAt && (
                      <span className="me-4">
                        <i className="ri-calendar-line me-1"></i>
                        Created: {new Date(yarnData.createdAt).toLocaleDateString()}
                      </span>
                    )}
                    {yarnData.updatedAt && (
                      <span>
                        <i className="ri-time-line me-1"></i>
                        Updated: {new Date(yarnData.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/cataloguing" 
                  className="ti-btn ti-btn-light"
                  title="Back to Cataloguing"
                >
                  <i className="ri-arrow-left-line me-2"></i>
                  Back
                </Link>
              </div>
            </div>
          </div>

          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Yarn Catalog Details</h3>
              <p className="text-sm text-gray-600 mt-1">
                Update the details below. Fields marked with * are required.
              </p>
            </div>
            <div className="box-body">
              {yarnData ? (
                <YarnForm
                  initialData={yarnData}
                  onSubmit={handleSubmit}
                  onCancel={() => router.push('/yarn-management/cataloguing')}
                  isSubmitting={isSubmitting}
                  submitButtonText="Update Yarn Catalog"
                />
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-gray-500 mt-4">Loading yarn catalog data...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditYarnPage;
