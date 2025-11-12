"use client";
import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface QCRecord {
  id: string;
  qcNumber: string;
  purchaseOrderNumber: string;
  receivedOrderNumber: string;
  supplier: string;
  qcDate: string;
  testedBy: string;
  status: 'Pending' | 'Passed' | 'Failed' | 'Partial';
  items: QCItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface QCItem {
  id: string;
  yarnCode: string;
  yarnName: string;
  batchNumber: string;
  quantity: number;
  testedQuantity: number;
  qualityStatus: 'Passed' | 'Failed' | 'Pending';
  testResults: {
    strength?: string;
    elongation?: string;
    colorFastness?: string;
    defects?: string;
  };
}

const YarnQCPage = () => {
  const { hasSubPermission } = useNavigation();
  
  // Static QC records data
  const staticQCRecords: QCRecord[] = [
    {
      id: "1",
      qcNumber: "QC-2024-001",
      purchaseOrderNumber: "PO-2024-001",
      receivedOrderNumber: "RCP-2024-001",
      supplier: "Reliance Industries",
      qcDate: "2024-01-25T10:30:00Z",
      testedBy: "Quality Team A",
      status: "Passed",
      items: [
        {
          id: "1",
          yarnCode: "CT40-001",
          yarnName: "Cotton Count 40",
          batchNumber: "BATCH-001",
          quantity: 200,
          testedQuantity: 200,
          qualityStatus: "Passed",
          testResults: {
            strength: "Good",
            elongation: "Normal",
            colorFastness: "Excellent",
            defects: "None"
          }
        }
      ],
      notes: "All quality parameters met",
      createdAt: "2024-01-25T10:30:00Z",
      updatedAt: "2024-01-25T14:20:00Z"
    },
    {
      id: "2",
      qcNumber: "QC-2024-002",
      purchaseOrderNumber: "PO-2024-002",
      receivedOrderNumber: "RCP-2024-002",
      supplier: "Aditya Birla Group",
      qcDate: "2024-01-20T14:30:00Z",
      testedBy: "Quality Team B",
      status: "Partial",
      items: [
        {
          id: "2",
          yarnCode: "PE150-002",
          yarnName: "Polyester DTY 150",
          batchNumber: "BATCH-002",
          quantity: 150,
          testedQuantity: 120,
          qualityStatus: "Pending",
          testResults: {
            strength: "Pending",
            elongation: "Pending",
            colorFastness: "Pending",
            defects: "Pending"
          }
        }
      ],
      notes: "Partial testing completed",
      createdAt: "2024-01-20T14:30:00Z",
      updatedAt: "2024-01-20T16:45:00Z"
    },
    {
      id: "3",
      qcNumber: "QC-2024-003",
      purchaseOrderNumber: "PO-2024-003",
      receivedOrderNumber: "RCP-2024-003",
      supplier: "Grasim Industries",
      qcDate: "2024-01-22T09:15:00Z",
      testedBy: "Quality Team A",
      status: "Pending",
      items: [
        {
          id: "3",
          yarnCode: "VR30-003",
          yarnName: "Viscose Rayon 30",
          batchNumber: "BATCH-003",
          quantity: 180,
          testedQuantity: 0,
          qualityStatus: "Pending",
          testResults: {
            strength: "Pending",
            elongation: "Pending",
            colorFastness: "Pending",
            defects: "Pending"
          }
        }
      ],
      notes: "Awaiting quality inspection",
      createdAt: "2024-01-22T09:15:00Z",
      updatedAt: "2024-01-22T09:15:00Z"
    }
  ];

  const [qcRecords, setQCRecords] = useState<QCRecord[]>(staticQCRecords);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Yarn QC');

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Yarn QC.</p>
          <Link href="/yarn-management/purchase-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase Management
          </Link>
        </div>
      </div>
    );
  }

  const filteredQCRecords = qcRecords.filter(qc => {
    const matchesSearch = 
      qc.qcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qc.purchaseOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qc.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || qc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Passed': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Partial': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleQCStatusUpdate = (recordId: string, action: 'Accepted' | 'Rejected') => {
    setQCRecords(prev =>
      prev.map(record =>
        record.id === recordId
          ? {
              ...record,
              status: action === 'Accepted' ? 'Passed' : 'Failed',
              updatedAt: new Date().toISOString(),
            }
          : record
      )
    );
    toast.success(`QC record ${action === 'Accepted' ? 'marked as Passed' : 'marked as Failed'}`);
  };

  return (
    <div className="main-content">
      <Seo title="Yarn QC" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Yarn QC</h1>
                <p className="text-gray-600 mt-1">Quality control for yarn purchases</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/purchase-management/yarn-qc/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-1"></i>
                  New QC Record
                </Link>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="box">
            <div className="box-body">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by QC number, PO number or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                    <option value="Partial">Partial</option>
                  </select>
                  <button className="ti-btn ti-btn-light">
                    <i className="ri-download-line me-1"></i>
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QC Records Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">QC Records ({filteredQCRecords.length})</h3>
            </div>
            <div className="box-body">
              {filteredQCRecords.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-checkbox-circle-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No QC Records</h3>
                  <p className="text-gray-500 mb-4">Start by creating your first QC record.</p>
                  <Link 
                    href="/yarn-management/purchase-management/yarn-qc/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Create First QC Record
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          QC Number
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PO Number
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          QC Date
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tested By
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredQCRecords.map((qc) => (
                        <tr key={qc.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {qc.qcNumber}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <Link 
                              href={`/yarn-management/purchase-management/purchase/${qc.purchaseOrderNumber}`}
                              className="text-primary hover:underline"
                            >
                              {qc.purchaseOrderNumber}
                            </Link>
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {qc.supplier}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(qc.qcDate).toLocaleDateString()}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {qc.testedBy}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(qc.status)}`}>
                              {qc.status}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleQCStatusUpdate(qc.id, e.target.value as 'Accepted' | 'Rejected');
                                  e.target.value = "";
                                }
                              }}
                              className="text-xs border border-gray-300 rounded px-2 py-1 h-7"
                              title="Update QC Status"
                            >
                              <option value="">Update Status</option>
                              <option value="Accepted">Mark as Accepted</option>
                              <option value="Rejected">Mark as Rejected</option>
                            </select>
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

export default YarnQCPage;

