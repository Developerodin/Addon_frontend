"use client"
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';

interface Machine {
  _id?: string;
  id?: string;
  machineCode: string;
  machineNumber: string;
  needleSize: string;
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
  needleSize: string;
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
    needleSize: '',
    model: '',
    floor: '',
    installationDate: '',
    maintenanceRequirement: '1 month',
    status: 'Active',
    assignedSupervisor: '',
    capacityPerShift: 0,
    capacityPerDay: 0,
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    maintenanceNotes: '',
    company: '',
    machineType: ''
  });

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
        machineCode: currentMachine.machineCode,
        machineNumber: currentMachine.machineNumber,
        needleSize: currentMachine.needleSize,
        model: currentMachine.model,
        floor: currentMachine.floor,
        installationDate: currentMachine.installationDate ? new Date(currentMachine.installationDate).toISOString().split('T')[0] : '',
        maintenanceRequirement: currentMachine.maintenanceRequirement,
        status: currentMachine.status,
        assignedSupervisor: currentMachine.assignedSupervisor?._id || '',
        capacityPerShift: currentMachine.capacityPerShift || 0,
        capacityPerDay: currentMachine.capacityPerDay || 0,
        lastMaintenanceDate: currentMachine.lastMaintenanceDate ? new Date(currentMachine.lastMaintenanceDate).toISOString().split('T')[0] : '',
        nextMaintenanceDate: currentMachine.nextMaintenanceDate ? new Date(currentMachine.nextMaintenanceDate).toISOString().split('T')[0] : '',
        maintenanceNotes: currentMachine.maintenanceNotes || '',
        company: currentMachine.company || '',
        machineType: currentMachine.machineType || ''
      });
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
    const newErrors: Partial<UpdateMachineData> = {};

    if (!formData.machineCode.trim()) {
      newErrors.machineCode = 'Machine code is required';
    }

    if (!formData.machineNumber.trim()) {
      newErrors.machineNumber = 'Machine number is required';
    }

    if (!formData.needleSize.trim()) {
      newErrors.needleSize = 'Needle size is required';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'Model is required';
    }

    if (!formData.floor.trim()) {
      newErrors.floor = 'Floor is required';
    }

    if (!formData.installationDate.trim()) {
      newErrors.installationDate = 'Installation date is required';
    }

    if (!formData.maintenanceRequirement.trim()) {
      newErrors.maintenanceRequirement = 'Maintenance requirement is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setIsUpdating(true);
      
      // Prepare the payload
      const payload = {
        ...formData,
        assignedSupervisor: formData.assignedSupervisor || undefined,
        capacityPerShift: formData.capacityPerShift || undefined,
        capacityPerDay: formData.capacityPerDay || undefined,
        lastMaintenanceDate: formData.lastMaintenanceDate || undefined,
        nextMaintenanceDate: formData.nextMaintenanceDate || undefined,
        maintenanceNotes: formData.maintenanceNotes || undefined,
        company: formData.company || undefined,
        machineType: formData.machineType || undefined
      };

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
                      Machine Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="machineCode"
                      value={formData.machineCode}
                      onChange={handleInputChange}
                      className={`form-control ${errors.machineCode ? 'is-invalid' : ''}`}
                      placeholder="Enter machine code"
                    />
                    {errors.machineCode && <div className="invalid-feedback">{errors.machineCode}</div>}
                  </div>

                  {/* Machine Number */}
                  <div className="form-group">
                    <label className="form-label">
                      Machine Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="machineNumber"
                      value={formData.machineNumber}
                      onChange={handleInputChange}
                      className={`form-control ${errors.machineNumber ? 'is-invalid' : ''}`}
                      placeholder="Enter machine number"
                    />
                    {errors.machineNumber && <div className="invalid-feedback">{errors.machineNumber}</div>}
                  </div>

                  {/* Needle Size */}
                  <div className="form-group">
                    <label className="form-label">
                      Needle Size <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="needleSize"
                      value={formData.needleSize}
                      onChange={handleInputChange}
                      className={`form-control ${errors.needleSize ? 'is-invalid' : ''}`}
                      placeholder="Enter needle size"
                    />
                    {errors.needleSize && <div className="invalid-feedback">{errors.needleSize}</div>}
                  </div>

                  {/* Floor */}
                  <div className="form-group">
                    <label className="form-label">
                      Floor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="floor"
                      value={formData.floor}
                      onChange={handleInputChange}
                      className={`form-control ${errors.floor ? 'is-invalid' : ''}`}
                      placeholder="Enter floor"
                    />
                    {errors.floor && <div className="invalid-feedback">{errors.floor}</div>}
                  </div>

                  {/* Installation Date */}
                  <div className="form-group">
                    <label className="form-label">
                      Installation Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="installationDate"
                      value={formData.installationDate}
                      onChange={handleInputChange}
                      className={`form-control ${errors.installationDate ? 'is-invalid' : ''}`}
                    />
                    {errors.installationDate && <div className="invalid-feedback">{errors.installationDate}</div>}
                  </div>

                  {/* Maintenance Requirement */}
                  <div className="form-group">
                    <label className="form-label">
                      Maintenance Requirement <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="maintenanceRequirement"
                      value={formData.maintenanceRequirement}
                      onChange={handleInputChange}
                      className={`form-select ${errors.maintenanceRequirement ? 'is-invalid' : ''}`}
                    >
                      <option value="1 month">1 month</option>
                      <option value="3 months">3 months</option>
                      <option value="6 months">6 months</option>
                      <option value="12 months">12 months</option>
                    </select>
                    {errors.maintenanceRequirement && <div className="invalid-feedback">{errors.maintenanceRequirement}</div>}
                  </div>

                  {/* Status */}
                  <div className="form-group">
                    <label className="form-label">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="form-select"
                    >
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
