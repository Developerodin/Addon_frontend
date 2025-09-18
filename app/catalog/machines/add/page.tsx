"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';

interface CreateMachineData {
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
}

const AddMachinePage = () => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [supervisors, setSupervisors] = useState<Array<{_id: string, name: string, email: string}>>([]);
  
  const [formData, setFormData] = useState<CreateMachineData>({
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
    maintenanceNotes: ''
  });

  const [errors, setErrors] = useState<Partial<CreateMachineData>>({});

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
    const newErrors: Partial<CreateMachineData> = {};

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
      setIsCreating(true);
      
      // Prepare the payload
      const payload = {
        ...formData,
        assignedSupervisor: formData.assignedSupervisor || undefined,
        capacityPerShift: formData.capacityPerShift || undefined,
        capacityPerDay: formData.capacityPerDay || undefined,
        lastMaintenanceDate: formData.lastMaintenanceDate || undefined,
        nextMaintenanceDate: formData.nextMaintenanceDate || undefined,
        maintenanceNotes: formData.maintenanceNotes || undefined
      };

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

                  {/* Model */}
                  <div className="form-group">
                    <label className="form-label">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      className={`form-control ${errors.model ? 'is-invalid' : ''}`}
                      placeholder="Enter model"
                    />
                    {errors.model && <div className="invalid-feedback">{errors.model}</div>}
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
