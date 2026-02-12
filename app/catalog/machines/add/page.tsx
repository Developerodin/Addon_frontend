"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import type { NeedleSizeConfigItem } from './types';

interface CreateMachineData {
  machineCode: string;
  machineNumber: string;
  model: string;
  floor: string;
  installationDate: string;
  maintenanceRequirement: string;
  status: 'Active' | 'Under Maintenance' | 'Idle';
  assignedSupervisor?: string;
  capacityPerShift?: number;
  capacityPerDay?: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenanceNotes?: string;
  company?: string;
  machineType?: string;
}

const AddMachinePage = () => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [supervisors, setSupervisors] = useState<Array<{_id: string, name: string, email: string}>>([]);
  
  const [formData, setFormData] = useState<CreateMachineData>({
    machineCode: '',
    machineNumber: '',
    model: '',
    floor: '',
    installationDate: '',
    maintenanceRequirement: '',
    status: '' as any,
    assignedSupervisor: '',
    capacityPerShift: 0,
    capacityPerDay: 0,
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    maintenanceNotes: '',
    company: '',
    machineType: ''
  });

  /** Needle configs: user can add multiple { needleSize, cutoffQuantity } */
  const [needleSizeConfig, setNeedleSizeConfig] = useState<NeedleSizeConfigItem[]>([]);
  /** Needle size options from catalog attributes (Needles attribute) */
  const [needleOptions, setNeedleOptions] = useState<string[]>([]);

  const [errors, setErrors] = useState<Partial<CreateMachineData>>({});

  // Fetch needle options from catalog attributes (Needles attribute)
  const fetchNeedleOptions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/product-attributes?page=1&limit=500`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      const results = data.results || [];
      const needlesAttr = results.find((a: { name: string }) => a.name?.toLowerCase() === 'needles');
      const values = needlesAttr?.optionValues || [];
      setNeedleOptions(values.map((v: { name: string }) => v.name).filter(Boolean));
    } catch {
      setNeedleOptions([]);
    }
  };

  // Fetch supervisors for assignment (optional - will fail silently if no auth)
  const fetchSupervisors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users?role=supervisor`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSupervisors(data.results || []);
      } else {
        // If unauthorized or any other error, just set empty array
        console.log('Supervisors fetch failed, continuing without supervisor data');
        setSupervisors([]);
      }
    } catch (error) {
      console.log('Error fetching supervisors, continuing without supervisor data:', error);
      setSupervisors([]);
    }
  };

  useEffect(() => {
    fetchSupervisors();
    fetchNeedleOptions();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof CreateMachineData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    // All fields are now optional, no validation needed
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation removed - all fields are optional

    try {
      setIsCreating(true);
      
      // Prepare the payload - convert empty strings to undefined
      const payload: any = {};
      
      if (formData.machineCode?.trim()) payload.machineCode = formData.machineCode.trim();
      if (formData.machineNumber?.trim()) payload.machineNumber = formData.machineNumber.trim();
      const validNeedleConfig = needleSizeConfig.filter(c => c.needleSize?.trim());
      if (validNeedleConfig.length > 0) {
        payload.needleSizeConfig = validNeedleConfig.map(c => ({
          needleSize: c.needleSize.trim(),
          cutoffQuantity: typeof c.cutoffQuantity === 'number' ? c.cutoffQuantity : 0,
        }));
      }
      if (formData.model?.trim()) payload.model = formData.model.trim();
      if (formData.floor?.trim()) payload.floor = formData.floor.trim();
      if (formData.installationDate?.trim()) payload.installationDate = formData.installationDate.trim();
      if (formData.maintenanceRequirement?.trim()) payload.maintenanceRequirement = formData.maintenanceRequirement.trim();
      if (formData.status?.trim()) payload.status = formData.status.trim();
      if (formData.assignedSupervisor?.trim()) payload.assignedSupervisor = formData.assignedSupervisor.trim();
      if (formData.capacityPerShift && formData.capacityPerShift > 0) payload.capacityPerShift = formData.capacityPerShift;
      if (formData.capacityPerDay && formData.capacityPerDay > 0) payload.capacityPerDay = formData.capacityPerDay;
      if (formData.lastMaintenanceDate?.trim()) payload.lastMaintenanceDate = formData.lastMaintenanceDate.trim();
      if (formData.nextMaintenanceDate?.trim()) payload.nextMaintenanceDate = formData.nextMaintenanceDate.trim();
      if (formData.maintenanceNotes?.trim()) payload.maintenanceNotes = formData.maintenanceNotes.trim();
      if (formData.company?.trim()) payload.company = formData.company.trim();
      if (formData.machineType?.trim()) payload.machineType = formData.machineType.trim();

      const response = await fetch(`${API_BASE_URL}/machines`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create machine');
      }

      toast.success('Machine created successfully');
      router.push('/catalog/machines');
    } catch (error) {
      console.error('Error creating machine:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create machine');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.push('/catalog/machines');
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Machine"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Add New Machine</h1>
              </div>
              <div className="box-tools">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="ti-btn ti-btn-secondary"
                >
                  <i className="ri-arrow-left-line me-2"></i>
                  Back to Machines
                </button>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Machine Code */}
                  <div className="form-group">
                    <label className="form-label">
                      Machine Code
                    </label>
                    <input
                      type="text"
                      name="machineCode"
                      value={formData.machineCode}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter machine code"
                    />
                  </div>

                  {/* Machine Number */}
                  <div className="form-group">
                    <label className="form-label">
                      Machine Number
                    </label>
                    <input
                      type="text"
                      name="machineNumber"
                      value={formData.machineNumber}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter machine number"
                    />
                  </div>

                  {/* Model */}
                  <div className="form-group">
                    <label className="form-label">
                      Model
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter model"
                    />
                  </div>

                  {/* Floor */}
                  <div className="form-group">
                    <label className="form-label">
                      Floor
                    </label>
                    <input
                      type="text"
                      name="floor"
                      value={formData.floor}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter floor"
                    />
                  </div>

                  {/* Installation Date */}
                  <div className="form-group">
                    <label className="form-label">
                      Installation Date
                    </label>
                    <input
                      type="date"
                      name="installationDate"
                      value={formData.installationDate}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  {/* Maintenance Requirement */}
                  <div className="form-group">
                    <label className="form-label">
                      Maintenance Requirement
                    </label>
                    <select
                      name="maintenanceRequirement"
                      value={formData.maintenanceRequirement}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="">Select maintenance requirement</option>
                      <option value="1 month">1 month</option>
                      <option value="3 months">3 months</option>
                      <option value="6 months">6 months</option>
                      <option value="12 months">12 months</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="form-group">
                    <label className="form-label">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="">Select status</option>
                      <option value="Active">Active</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Idle">Idle</option>
                    </select>
                  </div>

                  {/* Assigned Supervisor */}
                  <div className="form-group">
                    <label className="form-label">Assigned Supervisor</label>
                    <select
                      name="assignedSupervisor"
                      value={formData.assignedSupervisor}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="">Select supervisor (optional)</option>
                      {supervisors.map(supervisor => (
                        <option key={supervisor._id} value={supervisor._id}>
                          {supervisor.name} ({supervisor.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Capacity Per Shift */}
                  <div className="form-group">
                    <label className="form-label">Capacity Per Shift</label>
                    <input
                      type="number"
                      name="capacityPerShift"
                      value={formData.capacityPerShift}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter capacity per shift"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Capacity Per Day */}
                  <div className="form-group">
                    <label className="form-label">Capacity Per Day</label>
                    <input
                      type="number"
                      name="capacityPerDay"
                      value={formData.capacityPerDay}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter capacity per day"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Last Maintenance Date */}
                  <div className="form-group">
                    <label className="form-label">Last Maintenance Date</label>
                    <input
                      type="date"
                      name="lastMaintenanceDate"
                      value={formData.lastMaintenanceDate}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  {/* Next Maintenance Date */}
                  <div className="form-group">
                    <label className="form-label">Next Maintenance Date</label>
                    <input
                      type="date"
                      name="nextMaintenanceDate"
                      value={formData.nextMaintenanceDate}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  {/* Company */}
                  <div className="form-group">
                    <label className="form-label">Company</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter company"
                    />
                  </div>

                  {/* Machine Type */}
                  <div className="form-group">
                    <label className="form-label">Machine Type</label>
                    <input
                      type="text"
                      name="machineType"
                      value={formData.machineType}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter machine type"
                    />
                  </div>
                </div>

                {/* Maintenance Notes */}
                <div className="form-group">
                  <label className="form-label">Maintenance Notes</label>
                  <textarea
                    name="maintenanceNotes"
                    value={formData.maintenanceNotes}
                    onChange={handleInputChange}
                    className="form-control"
                    rows={4}
                    placeholder="Enter maintenance notes"
                  />
                </div>

                {/* Needle config: add multiple needleSize + cutoffQuantity */}
                <div className="form-group border-t pt-6">
                  <label className="form-label block mb-2">Needle Config</label>
                  <p className="text-xs text-gray-500 mb-3">Select needle size from catalog (Needles attribute) and set cutoff quantity.</p>
                  {needleSizeConfig.length > 0 && (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg mb-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Needle Size</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Cutoff Quantity</th>
                            <th className="px-3 py-2 w-20 text-right font-medium text-gray-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {needleSizeConfig.map((row, idx) => {
                            const optionsForRow = needleOptions.includes(row.needleSize)
                              ? needleOptions
                              : [...needleOptions, row.needleSize].filter(Boolean);
                            return (
                            <tr key={idx} className="border-b border-gray-100 last:border-0">
                              <td className="px-3 py-2">
                                <select
                                  value={row.needleSize}
                                  onChange={(e) => {
                                    const next = [...needleSizeConfig];
                                    next[idx] = { ...next[idx], needleSize: e.target.value };
                                    setNeedleSizeConfig(next);
                                  }}
                                  className="form-select py-1.5 text-sm"
                                >
                                  <option value="">Select needle size</option>
                                  {optionsForRow.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={row.cutoffQuantity}
                                  onChange={(e) => {
                                    const next = [...needleSizeConfig];
                                    next[idx] = { ...next[idx], cutoffQuantity: e.target.value === '' ? 0 : Number(e.target.value) };
                                    setNeedleSizeConfig(next);
                                  }}
                                  className="form-control py-1.5 text-sm"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => setNeedleSizeConfig(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setNeedleSizeConfig(prev => [...prev, { needleSize: '', cutoffQuantity: 0 }])}
                    className="ti-btn ti-btn-outline-primary text-sm"
                  >
                    <i className="ri-add-line me-1"></i>
                    Add Needle config
                  </button>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="ti-btn ti-btn-secondary"
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <i className="ri-loader-4-line animate-spin me-2"></i>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="ri-add-line me-2"></i>
                        Create Machine
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMachinePage;
