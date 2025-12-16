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
    needleSize: '',
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
      if (formData.needleSize?.trim()) payload.needleSize = formData.needleSize.trim();
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

                  {/* Needle Size */}
                  <div className="form-group">
                    <label className="form-label">
                      Needle Size
                    </label>
                    <input
                      type="text"
                      name="needleSize"
                      value={formData.needleSize}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter needle size"
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
