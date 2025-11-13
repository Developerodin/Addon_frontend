"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface BoxItem {
  id: string;
  barcode: string;
  boxNumber: number;
  purchaseOrderNumber: string;
  receivedOrderNumber: string;
  supplier: string;
  brand: string;
  yarnCode: string;
  yarnName: string;
  weight: number;
  numberOfCones: number;
  unitPrice: number;
  totalPrice: number;
  status: 'Pending' | 'QC Accepted' | 'QC Rejected';
  scannedAt?: string;
  qcDate?: string;
  qcBy?: string;
  qcNotes?: string;
}

interface QCMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  fileName: string;
  uploadedAt: string;
}

const ProcessQCPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hasSubPermission, isLoading } = useNavigation();
  const boxId = params?.boxId as string;
  const qcRecordId = searchParams?.get('qcRecordId') || '';

  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedBox, setScannedBox] = useState<BoxItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<QCMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [qcStatus, setQcStatus] = useState<'QC Accepted' | 'QC Rejected' | ''>('');
  const [qcNotes, setQcNotes] = useState("");
  const [qcBy, setQcBy] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock box data - in real app, fetch from API based on barcode
  const mockBoxes: BoxItem[] = [
    {
      id: "box-1",
      barcode: "PO2024001-001-ABCD",
      boxNumber: 1,
      purchaseOrderNumber: "PO-2024-001",
      receivedOrderNumber: "RCP-2024-001",
      supplier: "Reliance Industries",
      brand: "Reliance Premium",
      yarnCode: "CT40-001",
      yarnName: "Cotton Count 40",
      weight: 25.5,
      numberOfCones: 12,
      unitPrice: 450,
      totalPrice: 11475,
      status: 'Pending',
      scannedAt: new Date().toISOString()
    },
    {
      id: "box-2",
      barcode: "PO2024001-002-EFGH",
      boxNumber: 2,
      purchaseOrderNumber: "PO-2024-001",
      receivedOrderNumber: "RCP-2024-001",
      supplier: "Reliance Industries",
      brand: "Reliance Premium",
      yarnCode: "CT60-004",
      yarnName: "Cotton Count 60",
      weight: 18.3,
      numberOfCones: 8,
      unitPrice: 520,
      totalPrice: 9516,
      status: 'Pending',
      scannedAt: new Date().toISOString()
    },
    {
      id: "box-3",
      barcode: "PO2024002-001-IJKL",
      boxNumber: 1,
      purchaseOrderNumber: "PO-2024-002",
      receivedOrderNumber: "RCP-2024-002",
      supplier: "Aditya Birla Group",
      brand: "Birla Excellence",
      yarnCode: "PE150-002",
      yarnName: "Polyester DTY 150",
      weight: 22.7,
      numberOfCones: 10,
      unitPrice: 320,
      totalPrice: 7264,
      status: 'Pending',
      scannedAt: new Date().toISOString()
    }
  ];

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Yarn QC');

  useEffect(() => {
    // If boxId is provided in URL, try to find and load the box
    if (boxId && boxId !== 'new') {
      const foundBox = mockBoxes.find(b => b.id === boxId);
      if (foundBox) {
        setScannedBox(foundBox);
        setBarcodeInput(foundBox.barcode);
      }
    }
  }, [boxId]);

  const handleScanBarcode = () => {
    // If input is empty, fill with example barcode
    if (!barcodeInput.trim()) {
      const exampleBarcode = mockBoxes[0]?.barcode || "PO2024001-001-ABCD";
      setBarcodeInput(exampleBarcode);
      
      // Auto-scan after filling
      setIsScanning(true);
      setTimeout(() => {
        const foundBox = mockBoxes.find(b => b.barcode === exampleBarcode);
        if (foundBox) {
          setScannedBox(foundBox);
          toast.success("Box scanned successfully");
        }
        setIsScanning(false);
      }, 500);
      return;
    }

    setIsScanning(true);
    
    // Simulate barcode scan delay
    setTimeout(() => {
      const foundBox = mockBoxes.find(b => b.barcode === barcodeInput.trim());
      
      if (foundBox) {
        setScannedBox(foundBox);
        toast.success("Box scanned successfully");
      } else {
        toast.error("Box not found with this barcode");
        setScannedBox(null);
      }
      setIsScanning(false);
    }, 500);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    // Simulate file upload
    setTimeout(() => {
      const newMedia: QCMedia[] = Array.from(files).map((file, index) => ({
        id: `media-${Date.now()}-${index}`,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        url: URL.createObjectURL(file),
        fileName: file.name,
        uploadedAt: new Date().toISOString()
      }));
      
      setUploadedMedia(prev => [...prev, ...newMedia]);
      setIsUploading(false);
      toast.success(`${newMedia.length} file(s) uploaded successfully`);
    }, 1000);
  };

  const handleRemoveMedia = (mediaId: string) => {
    setUploadedMedia(prev => prev.filter(m => m.id !== mediaId));
    toast.success("File removed");
  };

  const handleSubmitQC = async () => {
    if (!scannedBox) {
      toast.error("Please scan a box first");
      return;
    }

    if (!qcStatus) {
      toast.error("Please select QC status");
      return;
    }

    if (!qcBy.trim()) {
      toast.error("Please enter QC inspector name");
      return;
    }

    if (!qcRecordId) {
      toast.error("QC Record ID is missing. Please navigate from the QC Records page.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Save processed QC record to localStorage
      const processedRecords = JSON.parse(localStorage.getItem('processedQCRecords') || '[]');
      if (!processedRecords.includes(qcRecordId)) {
        processedRecords.push(qcRecordId);
        localStorage.setItem('processedQCRecords', JSON.stringify(processedRecords));
      }

      // Save QC status update to localStorage
      const qcStatusUpdates = JSON.parse(localStorage.getItem('qcStatusUpdates') || '{}');
      const finalStatus = qcStatus === 'QC Accepted' ? 'Passed' : 'Failed';
      qcStatusUpdates[qcRecordId] = {
        status: finalStatus,
        qcDate: new Date().toISOString(),
        testedBy: qcBy.trim()
      };
      localStorage.setItem('qcStatusUpdates', JSON.stringify(qcStatusUpdates));

      // Dispatch custom events to notify parent page
      window.dispatchEvent(new Event('qcRecordProcessed'));
      window.dispatchEvent(new Event('qcStatusUpdated'));

      toast.success(`QC ${qcStatus === 'QC Accepted' ? 'accepted' : 'rejected'} successfully`);
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.push('/yarn-management/purchase-management/yarn-qc');
      }, 1500);
    } catch (error) {
      console.error('Failed to update QC status:', error);
      toast.error('Failed to update QC status');
      setIsSubmitting(false);
    }
  };

  // Show loading state while permissions are being loaded
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
          <p className="text-gray-500 mb-4">You don't have permission to access Yarn QC.</p>
          <Link href="/yarn-management/purchase-management/yarn-qc" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn QC
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Process QC - Box Inspection" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none mb-6">
            <div className="box-header flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Link
                    href="/yarn-management/purchase-management/yarn-qc"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <i className="ri-arrow-left-line text-xl"></i>
                  </Link>
                  <h1 className="box-title text-2xl font-semibold">Process QC - Box Inspection</h1>
                </div>
                <p className="text-gray-600 mt-1">Scan barcode to load box details and perform quality check</p>
              </div>
            </div>
          </div>

          {/* Barcode Scan Section */}
          <div className="box mb-6">
            <div className="box-header">
              <h3 className="box-title">
                <i className="ri-qr-scan-2-line me-2"></i>
                Scan Barcode
              </h3>
            </div>
            <div className="box-body">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Click Scan button to fill barcode automatically"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleScanBarcode();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={handleScanBarcode}
                  disabled={isScanning}
                  className="ti-btn ti-btn-primary whitespace-nowrap"
                >
                  {isScanning ? (
                    <>
                      <i className="ri-loader-4-line animate-spin me-2"></i>
                      Scanning...
                    </>
                  ) : (
                    <>
                      <i className="ri-qr-scan-2-line me-2"></i>
                      Scan
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click the Scan button to automatically fill barcode and load box details, or enter barcode manually and press Enter
              </p>
            </div>
          </div>

          {/* Box Details Section */}
          {scannedBox && (
            <>
              <div className="box mb-6">
                <div className="box-header">
                  <h3 className="box-title">
                    <i className="ri-box-3-line me-2"></i>
                    Box Details
                  </h3>
                </div>
                <div className="box-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Barcode</p>
                      <p className="text-sm font-semibold text-gray-900 font-mono">{scannedBox.barcode}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Box Number</p>
                      <p className="text-sm font-semibold text-gray-900">{scannedBox.boxNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Purchase Order</p>
                      <p className="text-sm font-semibold text-gray-900">{scannedBox.purchaseOrderNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Received Order</p>
                      <p className="text-sm font-semibold text-gray-900">{scannedBox.receivedOrderNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Supplier</p>
                      <p className="text-sm font-semibold text-gray-900">{scannedBox.supplier}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Brand</p>
                      <p className="text-sm font-semibold text-gray-900">{scannedBox.brand}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Yarn Code</p>
                      <p className="text-sm font-semibold text-gray-900">{scannedBox.yarnCode}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Yarn Name</p>
                      <p className="text-sm font-semibold text-gray-900">{scannedBox.yarnName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Weight</p>
                      <p className="text-sm font-semibold text-gray-900">{scannedBox.weight} kg</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Number of Cones</p>
                      <p className="text-sm font-semibold text-gray-900">{scannedBox.numberOfCones}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Unit Price</p>
                      <p className="text-sm font-semibold text-gray-900">₹{scannedBox.unitPrice.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Total Price</p>
                      <p className="text-sm font-semibold text-gray-900">₹{scannedBox.totalPrice.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Upload Section */}
              <div className="box mb-6">
                <div className="box-header">
                  <h3 className="box-title">
                    <i className="ri-image-line me-2"></i>
                    Upload Images & Videos
                  </h3>
                </div>
                <div className="box-body">
                  <div className="mb-4">
                    <label className="form-label">Upload QC Images/Videos</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="form-control"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Upload images or videos showing the quality inspection of this box
                    </p>
                  </div>

                  {uploadedMedia.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                      {uploadedMedia.map((media) => (
                        <div key={media.id} className="relative group">
                          {media.type === 'image' ? (
                            <img
                              src={media.url}
                              alt={media.fileName}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200"
                            />
                          ) : (
                            <video
                              src={media.url}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200"
                              controls
                            />
                          )}
                          <button
                            onClick={() => handleRemoveMedia(media.id)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove"
                          >
                            <i className="ri-close-line text-sm"></i>
                          </button>
                          <p className="text-xs text-gray-500 mt-1 truncate">{media.fileName}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* QC Status Update Section */}
              <div className="box mb-6">
                <div className="box-header">
                  <h3 className="box-title">
                    <i className="ri-checkbox-circle-line me-2"></i>
                    Update QC Status
                  </h3>
                </div>
                <div className="box-body">
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">
                        QC Status <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setQcStatus('QC Accepted')}
                          className={`flex-1 ti-btn ${
                            qcStatus === 'QC Accepted'
                              ? 'ti-btn-primary'
                              : 'ti-btn-outline-primary'
                          }`}
                          disabled={isSubmitting}
                        >
                          <i className="ri-checkbox-circle-line me-2"></i>
                          QC Accepted
                        </button>
                        <button
                          type="button"
                          onClick={() => setQcStatus('QC Rejected')}
                          className={`flex-1 ti-btn ${
                            qcStatus === 'QC Rejected'
                              ? 'ti-btn-danger'
                              : 'ti-btn-outline-danger'
                          }`}
                          disabled={isSubmitting}
                        >
                          <i className="ri-close-circle-line me-2"></i>
                          QC Rejected
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="form-label">
                        QC Inspector Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={qcBy}
                        onChange={(e) => setQcBy(e.target.value)}
                        placeholder="Enter QC inspector name"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label className="form-label">QC Notes</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        value={qcNotes}
                        onChange={(e) => setQcNotes(e.target.value)}
                        placeholder="Add any notes or observations about the quality inspection..."
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                      <Link
                        href="/yarn-management/purchase-management/yarn-qc"
                        className="ti-btn ti-btn-light"
                        onClick={(e) => {
                          if (isSubmitting) {
                            e.preventDefault();
                          }
                        }}
                      >
                        Cancel
                      </Link>
                      <button
                        type="button"
                        onClick={handleSubmitQC}
                        disabled={isSubmitting || !qcStatus || !qcBy.trim()}
                        className="ti-btn ti-btn-primary"
                      >
                        {isSubmitting ? (
                          <>
                            <i className="ri-loader-4-line animate-spin me-2"></i>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <i className="ri-check-line me-2"></i>
                            Update QC Status
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {!scannedBox && barcodeInput && (
            <div className="box">
              <div className="box-body text-center py-8">
                <div className="text-gray-400 mb-4">
                  <i className="ri-search-line text-4xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Box Found</h3>
                <p className="text-gray-500">Please scan a valid barcode to load box details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessQCPage;

