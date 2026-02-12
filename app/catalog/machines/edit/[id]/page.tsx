"use client"
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import type { NeedleSizeConfigItem } from '../../types';

interface Machine {
  _id?: string;
  id?: string;
  machineCode: string;
  machineNumber: string;
  needleSize?: string;
  needleSizeConfig?: NeedleSizeConfigItem[];
  model: string;
  floor: string;
  installationDate: string;
  maintenanceRequirement: string;
  capacityPerShift?: number;
  capacityPerDay?: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  assignedSupervisor?: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'Active' | 'Under Maintenance' | 'Idle';
  isActive: boolean;
  maintenanceNotes?: string;
  company?: string;
  machineType?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UpdateMachineData {
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

const EditMachinePage = () => {
  const router = useRouter();
  const params = useParams();
  const machineId = params?.id as string;
  
  // Fallback: extract ID from URL pathname if params.id is undefined
  const getMachineIdFromUrl = () => {
    if (machineId && machineId !== 'undefined') return machineId;
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      console.log('URL path parts:', pathParts); // Debug log
      const editIndex = pathParts.findIndex(part => part === 'edit');
      console.log('Edit index:', editIndex); // Debug log
      if (editIndex !== -1 && editIndex + 1 < pathParts.length) {
        const id = pathParts[editIndex + 1];
        console.log('Extracted ID from URL:', id); // Debug log
        return id;
      }
    }
    return null;
  };
  
  const finalMachineId = getMachineIdFromUrl();
  
  // Helper function to get machine ID (handles both _id and id fields)
  const getMachineId = (machine: Machine): string => {
    return machine._id || machine.id || '';
  };
  
  const [currentMachine, setCurrentMachine] = useState<Machine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supervisors, setSupervisors] = useState<Array<{_id: string, name: string, email: string}>>([]);
  
  const [formData, setFormData] = useState<UpdateMachineData>({
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

  const [errors, setErrors] = useState<Partial<UpdateMachineData>>({});

  // Fetch machine data
  const fetchMachine = async (id: string) => {
    if (!id || id === 'undefined') {
      setError('Invalid machine ID');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching machine with ID:', id); // Debug log
      const response = await fetch(`${API_BASE_URL}/machines/${id}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch machine');
      }
      
      const data = await response.json();
      setCurrentMachine(data);
    } catch (error) {
      console.error('Error fetching machine:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch machine');
      setCurrentMachine(null);
      toast.error('Failed to fetch machine');
    } finally {
      setIsLoading(false);
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
    console.log('Machine ID from params:', machineId); // Debug log
    console.log('Final machine ID:', finalMachineId); // Debug log
    console.log('Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');
    if (finalMachineId) {
      fetchMachine(finalMachineId);
      fetchSupervisors();
    } else {
      console.log('No valid machine ID found, setting error');
      setError('No valid machine ID found in URL');
      setIsLoading(false);
    }
  }, [finalMachineId]);

  useEffect(() => {
    if (currentMachine) {
      setFormData({
        machineCode: currentMachine.machineCode || '',
        machineNumber: currentMachine.machineNumber || '',
        model: currentMachine.model || '',
        floor: currentMachine.floor || '',
        installationDate: currentMachine.installationDate ? new Date(currentMachine.installationDate).toISOString().split('T')[0] : '',
        maintenanceRequirement: currentMachine.maintenanceRequirement || '',
        status: currentMachine.status || ('' as any),
        assignedSupervisor: currentMachine.assignedSupervisor?._id || '',
        capacityPerShift: currentMachine.capacityPerShift || 0,
        capacityPerDay: currentMachine.capacityPerDay || 0,
        lastMaintenanceDate: currentMachine.lastMaintenanceDate ? new Date(currentMachine.lastMaintenanceDate).toISOString().split('T')[0] : '',
        nextMaintenanceDate: currentMachine.nextMaintenanceDate ? new Date(currentMachine.nextMaintenanceDate).toISOString().split('T')[0] : '',
        maintenanceNotes: currentMachine.maintenanceNotes || '',
        company: currentMachine.company || '',
        machineType: currentMachine.machineType || ''
      });
      setNeedleSizeConfig(Array.isArray(currentMachine.needleSizeConfig) ? [...currentMachine.needleSizeConfig] : []);
    }
  }, [currentMachine]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof UpdateMachineData]) {
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
      setIsUpdating(true);
      
      // Prepare the payload - convert empty strings to undefined
      const payload: any = {};
      
      if (formData.machineCode?.trim()) payload.machineCode = formData.machineCode.trim();
      if (formData.machineNumber?.trim()) payload.machineNumber = formData.machineNumber.trim();
      const validNeedleConfig = needleSizeConfig.filter(c => c.needleSize?.trim());
      payload.needleSizeConfig = validNeedleConfig.length > 0
        ? validNeedleConfig.map(c => ({
            needleSize: c.needleSize.trim(),
            cutoffQuantity: typeof c.cutoffQuantity === 'number' ? c.cutoffQuantity : 0,
          }))
        : [];
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

      const response = await fetch(`${API_BASE_URL}/machines/${finalMachineId}`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update machine');
      }

      toast.success('Machine updated successfully');
      router.push('/catalog/machines');
    } catch (error) {
      console.error('Error updating machine:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update machine');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    router.push('/catalog/machines');
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <div className="text-center py-20">
          <i className="ri-error-warning-line text-6xl text-red-500 mb-4"></i>
          <h2 className="text-2xl font-semibold mb-2">Error Loading Machine</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/catalog/machines')}
            className="ti-btn ti-btn-primary"
          >
            <i className="ri-arrow-left-line me-2"></i>
            Back to Machines
          </button>
        </div>
      </div>
    );
  }

  if (!currentMachine) {
    return (
      <div className="main-content">
        <div className="text-center py-20">
          <i className="ri-error-warning-line text-6xl text-red-500 mb-4"></i>
          <h2 className="text-2xl font-semibold mb-2">Machine Not Found</h2>
          <p className="text-gray-600 mb-6">The machine you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => router.push('/catalog/machines')}
            className="ti-btn ti-btn-primary"
          >
            <i className="ri-arrow-left-line me-2"></i>
            Back to Machines
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Machine"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Edit Machine</h1>
                <span className="text-sm text-gray-500">({currentMachine.machineCode})</span>
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
                  <p className="text-xs text-gray-500 mb-3">Add one or more needle size and cutoff quantity pairs.</p>
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
                          {needleSizeConfig.map((row, idx) => (
                            <tr key={idx} className="border-b border-gray-100 last:border-0">
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.needleSize}
                                  onChange={(e) => {
                                    const next = [...needleSizeConfig];
                                    next[idx] = { ...next[idx], needleSize: e.target.value };
                                    setNeedleSizeConfig(next);
                                  }}
                                  className="form-control py-1.5 text-sm"
                                  placeholder="e.g. 10"
                                />
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
                          ))}
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
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <i className="ri-loader-4-line animate-spin me-2"></i>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line me-2"></i>
                        Update Machine
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

export default EditMachinePage;
