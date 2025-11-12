"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface QCRecord {
  id: string;
  qcNumber: string;
  purchaseOrderNumber: string;
  receivedOrderNumber: string;
  supplier: string;
  qcDate?: string;
  testedBy?: string;
  status: 'Pending' | 'Passed' | 'Failed' | 'Partial';
  items: QCItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  isProcessed?: boolean;
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
  const router = useRouter();
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
  const [processedQCRecords, setProcessedQCRecords] = useState<string[]>([]);

  // Load processed QC records from localStorage
  useEffect(() => {
    const loadProcessedRecords = () => {
      const stored = localStorage.getItem('processedQCRecords');
      if (stored) {
        try {
          setProcessedQCRecords(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading processed QC records:', error);
        }
      }
    };

    loadProcessedRecords();

    // Listen for custom event when QC record is processed
    const handleProcessedUpdate = () => {
      loadProcessedRecords();
    };

    window.addEventListener('qcRecordProcessed', handleProcessedUpdate);
    window.addEventListener('focus', loadProcessedRecords);

    return () => {
      window.removeEventListener('qcRecordProcessed', handleProcessedUpdate);
      window.removeEventListener('focus', loadProcessedRecords);
    };
  }, []);

  // Load and apply QC status updates from localStorage
  useEffect(() => {
    const loadAndApplyQCUpdates = () => {
      const stored = localStorage.getItem('qcStatusUpdates');
      if (stored) {
        try {
          const qcUpdates: Record<string, { status: 'Passed' | 'Failed', qcDate: string, testedBy: string }> = JSON.parse(stored);
          
          setQCRecords(prev => {
            return prev.map(record => {
              if (qcUpdates[record.id]) {
                return {
                  ...record,
                  status: qcUpdates[record.id].status,
                  qcDate: qcUpdates[record.id].qcDate,
                  testedBy: qcUpdates[record.id].testedBy,
                  isProcessed: true,
                  updatedAt: new Date().toISOString()
                };
              }
              return record;
            });
          });
        } catch (error) {
          console.error('Error loading QC status updates:', error);
        }
      }
    };

    loadAndApplyQCUpdates();

    const handleQCUpdate = () => {
      loadAndApplyQCUpdates();
    };

    window.addEventListener('qcStatusUpdated', handleQCUpdate);
    window.addEventListener('focus', loadAndApplyQCUpdates);

    return () => {
      window.removeEventListener('qcStatusUpdated', handleQCUpdate);
      window.removeEventListener('focus', loadAndApplyQCUpdates);
    };
  }, []);

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
    const finalStatus = action === 'Accepted' ? 'Passed' : 'Failed';
    const qcDate = new Date().toISOString();
    
    // Save to localStorage
    const processedRecords = JSON.parse(localStorage.getItem('processedQCRecords') || '[]');
    if (!processedRecords.includes(recordId)) {
      processedRecords.push(recordId);
      localStorage.setItem('processedQCRecords', JSON.stringify(processedRecords));
    }

    const qcStatusUpdates = JSON.parse(localStorage.getItem('qcStatusUpdates') || '{}');
    qcStatusUpdates[recordId] = {
      status: finalStatus,
      qcDate: qcDate,
      testedBy: 'Manual Update' // Default value for manual updates
    };
    localStorage.setItem('qcStatusUpdates', JSON.stringify(qcStatusUpdates));

    // Update state
    setQCRecords(prev =>
      prev.map(record =>
        record.id === recordId
          ? {
              ...record,
              status: finalStatus,
              qcDate: qcDate,
              testedBy: 'Manual Update',
              isProcessed: true,
              updatedAt: new Date().toISOString(),
            }
          : record
      )
    );

    // Update processed records list
    setProcessedQCRecords(prev => {
      if (!prev.includes(recordId)) {
        return [...prev, recordId];
      }
      return prev;
    });

    // Dispatch events
    window.dispatchEvent(new Event('qcRecordProcessed'));
    window.dispatchEvent(new Event('qcStatusUpdated'));

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
                            {(processedQCRecords.includes(qc.id) || qc.isProcessed) && qc.qcDate 
                              ? new Date(qc.qcDate).toLocaleDateString() 
                              : '-'}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(processedQCRecords.includes(qc.id) || qc.isProcessed) && qc.testedBy 
                              ? qc.testedBy 
                              : '-'}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(processedQCRecords.includes(qc.id) || qc.isProcessed ? qc.status : 'Pending')}`}>
                              {processedQCRecords.includes(qc.id) || qc.isProcessed ? qc.status : 'Pending'}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              {processedQCRecords.includes(qc.id) || qc.isProcessed ? (
                                <button
                                  disabled
                                  className="inline-flex items-center justify-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-1 text-sm text-green-700 cursor-not-allowed h-8"
                                  title="QC has been processed"
                                >
                                  <i className="ri-checkbox-circle-line"></i>
                                  PROCESSED
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    router.push(`/yarn-management/purchase-management/yarn-qc/process/new?qcRecordId=${qc.id}`);
                                  }}
                                  className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:border-primary hover:text-primary transition h-8"
                                  title="Process QC - Scan box barcode"
                                >
                                  <i className="ri-box-3-line"></i>
                                  Process
                                </button>
                              )}
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

export default YarnQCPage;

