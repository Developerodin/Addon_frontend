"use client";
import React from 'react';
import { Article, ArticleUpdateMap } from './FinalCheckingTypes';
import { getPriorityBadge } from './FinalCheckingUtils';

interface Props {
  visible: boolean;
  orderId: string;
  articles: Article[];
  activeIndex: number;
  setActiveIndex: (idx: number) => void;
  updateMap: ArticleUpdateMap;
  onClose: () => void;
  onChangeQty: (articleId: string, v: number) => void;
  onChangeRemark: (articleId: string, v: string) => void;
  onChangeMx: (articleId: string, which: 'm1Quantity' | 'm2Quantity' | 'm3Quantity' | 'm4Quantity', v: number) => void;
  onChangeRepairStatus: (articleId: string, v: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected') => void;
  onChangeRepairRemarks: (articleId: string, v: string) => void;
  onShiftFromM2: (articleId: string, target: 'M1' | 'M3' | 'M4', qty: number) => void;
  onConfirmFinalQuality: (articleId: string, confirmed: boolean) => void;
  onSubmit: () => void;
}

const FinalCheckingUpdateModal: React.FC<Props> = ({
  visible,
  orderId,
  articles,
  activeIndex,
  setActiveIndex,
  updateMap,
  onClose,
  onChangeQty,
  onChangeRemark,
  onChangeMx,
  onChangeRepairStatus,
  onChangeRepairRemarks,
  onShiftFromM2,
  onConfirmFinalQuality,
  onSubmit,
}) => {
  if (!visible) return null;
  const article = articles[activeIndex];
  if (!article) return null;
  const u = updateMap[article.id] || {
    completedQuantity: article.completedQuantity,
    remarks: article.remarks || '',
    m1Quantity: article.m1Quantity,
    m2Quantity: article.m2Quantity,
    m3Quantity: article.m3Quantity,
    m4Quantity: article.m4Quantity,
    repairStatus: article.repairStatus,
    repairRemarks: article.repairRemarks || '',
  };

  const totalChecked = (u.m1Quantity || 0) + (u.m2Quantity || 0) + (u.m3Quantity || 0) + (u.m4Quantity || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Update Order - {orderId}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="space-y-6">
          <div className="mb-2">
            <div className="flex gap-2 overflow-x-auto pb-2 border-b">
              {articles.map((a, idx) => (
                <button
                  key={a.id}
                  className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${
                    idx === activeIndex
                      ? 'bg-white border border-b-white border-gray-300 text-gray-900'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }`}
                  onClick={() => setActiveIndex(idx)}
                  title={a.articleNumber}
                >
                  {a.articleNumber || `Article ${idx + 1}`}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h5 className="text-md font-medium text-gray-900">{article.articleNumber}</h5>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Linking Type:</span> {article.linkingType}
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(article.priority)}`}>
                  {article.priority}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="form-label">Planned Quantity</label>
                <div className="text-lg font-semibold text-gray-900">{article.plannedQuantity.toLocaleString()}</div>
              </div>
              <div>
                <label className="form-label">Completed Quantity *</label>
                <input
                  type="number"
                  className="form-control"
                  value={u.completedQuantity || 0}
                  onChange={(e) => onChangeQty(article.id, Number(e.target.value))}
                  min={0}
                  max={article.plannedQuantity}
                />
              </div>
            </div>

            <div className="mb-6">
              <h6 className="text-md font-semibold text-gray-900 mb-3 border-b pb-2">Step 7B: Article-wise Checked Quantities</h6>
              <div className="grid grid-cols-2 md-grid-cols-4 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="form-label text-green-700 font-medium">M1 - Good Quality</label>
                  <input type="number" className="form-control border-green-300 focus:border-green-500" value={u.m1Quantity || 0} onChange={(e) => onChangeMx(article.id, 'm1Quantity', Number(e.target.value))} min={0} max={article.plannedQuantity} />
                  <small className="text-green-600">Ready for next step</small>
                </div>
                <div>
                  <label className="form-label text-yellow-700 font-medium">M2 - Needs Repair</label>
                  <input type="number" className="form-control border-yellow-300 focus:border-yellow-500" value={u.m2Quantity || 0} onChange={(e) => onChangeMx(article.id, 'm2Quantity', Number(e.target.value))} min={0} max={article.plannedQuantity} />
                  <small className="text-yellow-600">To be reviewed</small>
                </div>
                <div>
                  <label className="form-label text-orange-700 font-medium">M3 - Minor Defects</label>
                  <input type="number" className="form-control border-orange-300 focus:border-orange-500" value={u.m3Quantity || 0} onChange={(e) => onChangeMx(article.id, 'm3Quantity', Number(e.target.value))} min={0} max={article.plannedQuantity} />
                  <small className="text-orange-600">Can be fixed</small>
                </div>
                <div>
                  <label className="form-label text-red-700 font-medium">M4 - Major Defects</label>
                  <input type="number" className="form-control border-red-300 focus:border-red-500" value={u.m4Quantity || 0} onChange={(e) => onChangeMx(article.id, 'm4Quantity', Number(e.target.value))} min={0} max={article.plannedQuantity} />
                  <small className="text-red-600">Needs significant repair</small>
                </div>
              </div>

              {u.m2Quantity > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <h6 className="text-md font-semibold text-yellow-800 mb-3">Step 7B: M2 Items Repair Review</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="form-label">Repair Status</label>
                      <select className="form-select" value={u.repairStatus || 'Not Required'} onChange={(e) => onChangeRepairStatus(article.id, e.target.value as any)}>
                        <option value="Not Required">Not Required</option>
                        <option value="In Review">In Review</option>
                        <option value="Repaired">Repaired</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">M2 Items Available: {u.m2Quantity || 0}</label>
                      <div className="flex gap-2 mt-2">
                        <button type="button" className="ti-btn ti-btn-success ti-btn-sm" onClick={() => onShiftFromM2(article.id, 'M1', Math.min(10, u.m2Quantity || 0))} disabled={!u.m2Quantity}>Shift 10 to M1</button>
                        <button type="button" className="ti-btn ti-btn-warning ti-btn-sm" onClick={() => onShiftFromM2(article.id, 'M3', Math.min(10, u.m2Quantity || 0))} disabled={!u.m2Quantity}>Shift 10 to M3</button>
                        <button type="button" className="ti-btn ti-btn-danger ti-btn-sm" onClick={() => onShiftFromM2(article.id, 'M4', Math.min(10, u.m2Quantity || 0))} disabled={!u.m2Quantity}>Shift 10 to M4</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Repair Remarks</label>
                    <textarea className="form-control" rows={2} placeholder="Add repair remarks for M2 items..." value={u.repairRemarks || ''} onChange={(e) => onChangeRepairRemarks(article.id, e.target.value)} />
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center"><div className="font-medium text-green-700">M1: {u.m1Quantity || 0}</div></div>
                  <div className="text-center"><div className="font-medium text-yellow-700">M2: {u.m2Quantity || 0}</div></div>
                  <div className="text-center"><div className="font-medium text-orange-700">M3: {u.m3Quantity || 0}</div></div>
                  <div className="text-center"><div className="font-medium text-red-700">M4: {u.m4Quantity || 0}</div></div>
                </div>
                <div className="text-center mt-2 text-xs text-gray-600">Total Checked: {totalChecked} / {article.plannedQuantity}</div>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">Remarks</label>
              <textarea className="form-control" rows={2} placeholder="Add remarks for this article..." value={u.remarks || ''} onChange={(e) => onChangeRemark(article.id, e.target.value)} />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <input id={`finalQuality-${article.id}`} type="checkbox" className="form-check-input" checked={!!article.finalQualityConfirmed} onChange={(e) => onConfirmFinalQuality(article.id, e.target.checked)} />
              <label htmlFor={`finalQuality-${article.id}`} className="text-sm">Final quality status confirmed for this article</label>
            </div>

            <div className="flex justify-between items-center text-sm text-gray-600">
              <div>Remaining: {(article.plannedQuantity - (u.completedQuantity || 0)).toLocaleString()}</div>
              <div>Progress: {Math.round(((u.completedQuantity || 0) / article.plannedQuantity) * 100)}%</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t">
          <div className="flex items-center gap-2 mr-auto text-xs text-gray-600">
            <i className="ri-information-line"></i>
            <span>Confirm final quality for each article to enable forwarding.</span>
          </div>
          <button onClick={onClose} className="ti-btn ti-btn-secondary">Cancel</button>
          <button onClick={onSubmit} className="ti-btn ti-btn-primary"><i className="ri-save-line me-2"></i>Update</button>
        </div>
      </div>
    </div>
  );
};

export default FinalCheckingUpdateModal;


