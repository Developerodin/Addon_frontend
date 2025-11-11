"use client";

import React, { useState } from 'react';
import { PickPackList, QualityCheck, QualityStatus } from '../types';

interface QualityCheckPageProps {
  pickPackList: PickPackList | null;
  onBack: () => void;
  onApprove: (listId: string, checks: QualityCheck[]) => void;
  onReject: (listId: string, checks: QualityCheck[]) => void;
}

const QualityCheckPage: React.FC<QualityCheckPageProps> = ({
  pickPackList,
  onBack,
  onApprove,
  onReject,
}) => {
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([]);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [defects, setDefects] = useState<{ [key: string]: string[] }>({});

  if (!pickPackList) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No pick pack list selected</p>
        <button onClick={onBack} className="ti-btn ti-btn-secondary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  const handleQualityCheck = (itemId: string, status: QualityStatus) => {
    const existingCheck = qualityChecks.find(c => c.itemId === itemId);
    const newCheck: QualityCheck = {
      id: existingCheck?.id || `QC-${Date.now()}-${itemId}`,
      itemId,
      sku: pickPackList.items.find(i => i.id === itemId)?.sku || '',
      quantity: pickPackList.items.find(i => i.id === itemId)?.pickedQuantity || 0,
      status,
      checkedBy: 'Current User', // In real app, get from auth context
      checkedAt: new Date().toISOString(),
      notes: notes[itemId],
      defects: defects[itemId] || [],
    };

    setQualityChecks(prev => {
      const filtered = prev.filter(c => c.itemId !== itemId);
      return [...filtered, newCheck];
    });
  };

  const handleAddDefect = (itemId: string) => {
    const defect = prompt('Enter defect description:');
    if (defect) {
      setDefects(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), defect],
      }));
    }
  };

  const handleRemoveDefect = (itemId: string, defectIndex: number) => {
    setDefects(prev => ({
      ...prev,
      [itemId]: prev[itemId]?.filter((_, idx) => idx !== defectIndex) || [],
    }));
  };

  const allChecked = pickPackList.items.every(item => 
    qualityChecks.some(check => check.itemId === item.id)
  );

  const handleApprove = () => {
    if (!allChecked) {
      alert('Please check all items before approving');
      return;
    }
    onApprove(pickPackList.id, qualityChecks);
  };

  const handleReject = () => {
    if (!allChecked) {
      alert('Please check all items before rejecting');
      return;
    }
    onReject(pickPackList.id, qualityChecks);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Quality Check</h2>
          <p className="text-sm text-gray-600 mt-1">
            Order: {pickPackList.orderNumber} | List: {pickPackList.id}
          </p>
        </div>
        <button onClick={onBack} className="ti-btn ti-btn-secondary">
          <i className="ri-arrow-left-line me-2"></i>
          Back
        </button>
      </div>

      {/* Items to Check */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Items Quality Check</h3>
        </div>
        <div className="box-body">
          <div className="space-y-4">
            {pickPackList.items.map((item) => {
              const check = qualityChecks.find(c => c.itemId === item.id);
              const itemDefects = defects[item.id] || [];

              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 ${
                    check?.status === 'passed'
                      ? 'border-green-500 bg-green-50'
                      : check?.status === 'failed'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{item.sku}</h4>
                        <span className="text-sm text-gray-600">{item.name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Requested:</span>
                          <span className="ml-2 font-medium">{item.requestedQuantity}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Picked:</span>
                          <span className="ml-2 font-medium">{item.pickedQuantity}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Location:</span>
                          <span className="ml-2 font-medium">{item.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleQualityCheck(item.id, 'passed')}
                        className={`ti-btn ti-btn-sm ${
                          check?.status === 'passed'
                            ? 'ti-btn-success'
                            : 'ti-btn-light'
                        }`}
                      >
                        <i className="ri-check-line me-1"></i>
                        Pass
                      </button>
                      <button
                        onClick={() => handleQualityCheck(item.id, 'failed')}
                        className={`ti-btn ti-btn-sm ${
                          check?.status === 'failed'
                            ? 'ti-btn-danger'
                            : 'ti-btn-light'
                        }`}
                      >
                        <i className="ri-close-line me-1"></i>
                        Fail
                      </button>
                    </div>
                  </div>

                  {/* Defects Section */}
                  {check?.status === 'failed' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-medium text-sm">Defects:</label>
                        <button
                          onClick={() => handleAddDefect(item.id)}
                          className="ti-btn ti-btn-sm ti-btn-secondary"
                        >
                          <i className="ri-add-line me-1"></i>
                          Add Defect
                        </button>
                      </div>
                      {itemDefects.length > 0 && (
                        <div className="space-y-2">
                          {itemDefects.map((defect, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-red-100 rounded p-2"
                            >
                              <span className="text-sm">{defect}</span>
                              <button
                                onClick={() => handleRemoveDefect(item.id, idx)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <i className="ri-close-line"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes Section */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="form-label text-sm">Notes:</label>
                    <textarea
                      className="form-control mt-1"
                      rows={2}
                      value={notes[item.id] || ''}
                      onChange={(e) =>
                        setNotes(prev => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Add quality check notes..."
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleApprove}
              disabled={!allChecked}
              className="ti-btn ti-btn-success flex-1"
            >
              <i className="ri-checkbox-circle-line me-2"></i>
              Approve All
            </button>
            <button
              onClick={handleReject}
              disabled={!allChecked}
              className="ti-btn ti-btn-danger flex-1"
            >
              <i className="ri-close-circle-line me-2"></i>
              Reject All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityCheckPage;


