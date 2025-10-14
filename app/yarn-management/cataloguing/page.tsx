"use client";
import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface YarnSpecification {
  id: string;
  yarnName: string;
  yarnType: string;
  countDenier: string;
  color: string;
  lotNo: string;
  supplier: string;
  unitOfMeasurement: string;
  ratePerUnit: number;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

const CataloguingPage = () => {
  const { hasSubPermission } = useNavigation();
  
  // Static yarn specifications data
  const staticYarns: YarnSpecification[] = [
    {
      id: "1",
      yarnName: "Cotton Count 40",
      yarnType: "Cotton",
      countDenier: "40s",
      color: "#FFFFFF",
      lotNo: "CT40-001",
      supplier: "Reliance Industries",
      unitOfMeasurement: "kg",
      ratePerUnit: 450,
      remarks: "High quality cotton yarn",
      createdAt: "2024-01-15T10:30:00Z",
      updatedAt: "2024-01-15T10:30:00Z"
    },
    {
      id: "2",
      yarnName: "Polyester DTY 150",
      yarnType: "Polyester",
      countDenier: "150D",
      color: "#000000",
      lotNo: "PE150-002",
      supplier: "Aditya Birla Group",
      unitOfMeasurement: "kg",
      ratePerUnit: 320,
      remarks: "Draw textured yarn",
      createdAt: "2024-01-16T09:15:00Z",
      updatedAt: "2024-01-16T09:15:00Z"
    },
    {
      id: "3",
      yarnName: "Viscose Rayon 30",
      yarnType: "Viscose",
      countDenier: "30s",
      color: "#FF0000",
      lotNo: "VR30-003",
      supplier: "Grasim Industries",
      unitOfMeasurement: "kg",
      ratePerUnit: 380,
      remarks: "Soft and absorbent",
      createdAt: "2024-01-17T14:20:00Z",
      updatedAt: "2024-01-17T14:20:00Z"
    },
    {
      id: "4",
      yarnName: "Cotton Count 60",
      yarnType: "Cotton",
      countDenier: "60s",
      color: "#0000FF",
      lotNo: "CT60-004",
      supplier: "Reliance Industries",
      unitOfMeasurement: "kg",
      ratePerUnit: 520,
      remarks: "Fine count cotton",
      createdAt: "2024-01-18T11:45:00Z",
      updatedAt: "2024-01-18T11:45:00Z"
    },
    {
      id: "5",
      yarnName: "Nylon FDY 70",
      yarnType: "Nylon",
      countDenier: "70D",
      color: "#00FF00",
      lotNo: "NY70-005",
      supplier: "SRF Limited",
      unitOfMeasurement: "kg",
      ratePerUnit: 280,
      remarks: "Fully drawn yarn",
      createdAt: "2024-01-19T16:30:00Z",
      updatedAt: "2024-01-19T16:30:00Z"
    },
    {
      id: "6",
      yarnName: "Cotton Count 20",
      yarnType: "Cotton",
      countDenier: "20s",
      color: "#FFFF00",
      lotNo: "CT20-006",
      supplier: "Welspun India",
      unitOfMeasurement: "kg",
      ratePerUnit: 380,
      remarks: "Coarse count cotton",
      createdAt: "2024-01-20T08:15:00Z",
      updatedAt: "2024-01-20T08:15:00Z"
    },
    {
      id: "7",
      yarnName: "Polyester POY 100",
      yarnType: "Polyester",
      countDenier: "100D",
      color: "#FF00FF",
      lotNo: "PE100-007",
      supplier: "Aditya Birla Group",
      unitOfMeasurement: "kg",
      ratePerUnit: 290,
      remarks: "Partially oriented yarn",
      createdAt: "2024-01-21T13:25:00Z",
      updatedAt: "2024-01-21T13:25:00Z"
    },
    {
      id: "8",
      yarnName: "Viscose Rayon 40",
      yarnType: "Viscose",
      countDenier: "40s",
      color: "#00FFFF",
      lotNo: "VR40-008",
      supplier: "Grasim Industries",
      unitOfMeasurement: "kg",
      ratePerUnit: 400,
      remarks: "Medium count viscose",
      createdAt: "2024-01-22T10:10:00Z",
      updatedAt: "2024-01-22T10:10:00Z"
    },
    {
      id: "9",
      yarnName: "Cotton Count 80",
      yarnType: "Cotton",
      countDenier: "80s",
      color: "#800080",
      lotNo: "CT80-009",
      supplier: "Reliance Industries",
      unitOfMeasurement: "kg",
      ratePerUnit: 680,
      remarks: "Super fine cotton",
      createdAt: "2024-01-23T15:40:00Z",
      updatedAt: "2024-01-23T15:40:00Z"
    },
    {
      id: "10",
      yarnName: "Polyester DTY 200",
      yarnType: "Polyester",
      countDenier: "200D",
      color: "#FFA500",
      lotNo: "PE200-010",
      supplier: "Aditya Birla Group",
      unitOfMeasurement: "kg",
      ratePerUnit: 350,
      remarks: "Heavy denier polyester",
      createdAt: "2024-01-24T12:55:00Z",
      updatedAt: "2024-01-24T12:55:00Z"
    }
  ];

  const [yarns, setYarns] = useState<YarnSpecification[]>(staticYarns);
  const [searchTerm, setSearchTerm] = useState("");

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
          <p className="text-gray-500 mb-4">You don't have permission to access Yarn Cataloguing.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  const handleDeleteYarn = async (yarnId: string) => {
    if (!confirm('Are you sure you want to delete this yarn specification?')) return;
    
    try {
      // TODO: Implement API call to delete yarn
      setYarns(prev => prev.filter(yarn => yarn.id !== yarnId));
      toast.success('Yarn specification deleted successfully');
    } catch (error) {
      console.error('Failed to delete yarn:', error);
      toast.error('Failed to delete yarn specification');
    }
  };

  const filteredYarns = yarns.filter(yarn =>
    yarn.yarnName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    yarn.yarnType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    yarn.countDenier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    yarn.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
    yarn.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    yarn.lotNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="main-content">
      <Seo title="Yarn Cataloguing" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Yarn Cataloguing</h1>
                <p className="text-gray-600 mt-1">Manage yarn specifications and catalog</p>
              </div>
              <div className="box-tools">
               
                <Link 
                  href="/yarn-management/cataloguing/add"
                  className="ti-btn ti-btn-primary "
                >
                  <i className="ri-add-line me-1"></i>
                  Add Yarn
                </Link>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="box">
            <div className="box-body">
              <div className="flex flex-col md:flex-row gap-4">
                <div >
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by yarn name, type, count, color, supplier, or lot no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button className="ti-btn ti-btn-light ">
                    <i className="ri-filter-line me-1"></i>
                    Filter
                  </button>
                  <button className="ti-btn ti-btn-light">
                    <i className="ri-download-line me-1"></i>
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Yarn Specifications Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Yarn Specifications ({filteredYarns.length})</h3>
            </div>
            <div className="box-body">
              {filteredYarns.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-book-open-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Yarn Specifications</h3>
                  <p className="text-gray-500 mb-4">Start by adding your first yarn specification.</p>
                  <Link 
                    href="/yarn-management/cataloguing/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Add First Yarn
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Yarn Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Count/Denier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Color
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lot No.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rate/Unit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredYarns.map((yarn) => (
                        <tr key={yarn.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {yarn.yarnName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {yarn.yarnType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {yarn.countDenier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="inline-flex items-center">
                              <span 
                                className="w-4 h-4 rounded-full mr-2 border border-gray-300"
                                style={{ backgroundColor: yarn.color }}
                              ></span>
                              {yarn.color}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {yarn.lotNo || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {yarn.supplier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{yarn.ratePerUnit}/{yarn.unitOfMeasurement}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Link
                                href={`/yarn-management/cataloguing/edit/${yarn.id}`}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <i className="ri-edit-line"></i>
                              </Link>
                              <button
                                onClick={() => handleDeleteYarn(yarn.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CataloguingPage;
