"use client";
import React, { useRef } from "react";
import { Cone, PackedBox } from "../types";

interface BarcodePrintViewProps {
  cones: Cone[];
  box: PackedBox;
  onPrintComplete: () => void;
}

const BarcodePrintView: React.FC<BarcodePrintViewProps> = ({
  cones,
  box,
  onPrintComplete,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print barcodes");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcodes - ${box.boxBarcode}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .barcode-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 20px;
            }
            .barcode-item {
              border: 1px solid #ddd;
              padding: 15px;
              text-align: center;
              page-break-inside: avoid;
            }
            .barcode-label {
              font-size: 12px;
              margin-bottom: 10px;
              font-weight: bold;
            }
            .barcode-code {
              font-family: 'Courier New', monospace;
              font-size: 14px;
              margin: 10px 0;
              word-break: break-all;
            }
            .barcode-info {
              font-size: 10px;
              color: #666;
              margin-top: 5px;
            }
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <h2 class="no-print">Barcodes for Box: ${box.boxBarcode}</h2>
          <div class="barcode-container">
            ${cones
              .map(
                (cone, index) => `
              <div class="barcode-item">
                <div class="barcode-label">Cone ${index + 1}</div>
                <div class="barcode-code">${cone.coneBarcode}</div>
                <div class="barcode-info">
                  ${box.yarnName}<br>
                  ${box.poNumber ? `PO: ${box.poNumber}<br>` : ""}
                  ${box.supplierName ? `Supplier: ${box.supplierName}<br>` : ""}
                  Weight: ${cone.weight.toFixed(2)} kg<br>
                  Box: ${box.boxBarcode}
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 250);
    };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            Barcodes Generated - Ready to Print
          </h3>
          <button
            onClick={onPrintComplete}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-900">Box:</span>{" "}
                <span className="text-blue-700">{box.boxBarcode}</span>
              </div>
              <div>
                <span className="font-medium text-blue-900">Yarn:</span>{" "}
                <span className="text-blue-700">{box.yarnName}</span>
              </div>
              {box.poNumber && (
                <div>
                  <span className="font-medium text-blue-900">PO:</span>{" "}
                  <span className="text-blue-700">{box.poNumber}</span>
                </div>
              )}
              {box.supplierName && (
                <div>
                  <span className="font-medium text-blue-900">Supplier:</span>{" "}
                  <span className="text-blue-700">{box.supplierName}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-blue-900">Total Cones:</span>{" "}
                <span className="text-blue-700">{cones.length}</span>
              </div>
              <div>
                <span className="font-medium text-blue-900">Total Weight:</span>{" "}
                <span className="text-blue-700">{box.weight} kg</span>
              </div>
            </div>
          </div>

          <div ref={printRef} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cones.map((cone, index) => (
                <div
                  key={cone.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="text-center">
                    <div className="text-xs font-semibold text-gray-500 mb-2">
                      Cone {index + 1}
                    </div>
                    <div className="bg-gray-50 p-3 rounded mb-2">
                      <div className="font-mono text-sm font-bold text-gray-800">
                        {cone.coneBarcode}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>{box.yarnName}</div>
                      {box.poNumber && <div>PO: {box.poNumber}</div>}
                      {box.supplierName && (
                        <div>Supplier: {box.supplierName}</div>
                      )}
                      <div>Weight: {cone.weight.toFixed(2)} kg</div>
                      <div className="text-gray-400">Box: {box.boxBarcode}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button onClick={onPrintComplete} className="ti-btn ti-btn-light">
              Close
            </button>
            <button onClick={handlePrint} className="ti-btn ti-btn-primary">
              <i className="ri-printer-line me-1"></i>
              Print All Barcodes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodePrintView;

