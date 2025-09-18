"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import HelpIcon from '@/shared/components/HelpIcon';

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
  createdAt?: string;
  updatedAt?: string;
}

interface MachinesResponse {
  results: Machine[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface ExcelRow {
  'ID'?: string;
  'Machine Code': string;
  'Machine Number': string;
  'Needle Size': string;
  'Model': string;
  'Floor': string;
  'Installation Date': string;
  'Maintenance Requirement': string;
  'Status': string;
  'Assigned Supervisor'?: string;
  'Capacity Per Shift'?: number;
  'Capacity Per Day'?: number;
  'Last Maintenance Date'?: string;
  'Next Maintenance Date'?: string;
  'Maintenance Notes'?: string;
}

const MachinesPage = () => {
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to get machine ID (handles both _id and id fields)
  const getMachineId = (machine: Machine): string => {
    return machine._id || machine.id || '';
  };

  // Fetch machines from API (with pagination and search)
  const fetchMachines = async (page = 1, limit = itemsPerPage, search = '') => {
    try {
      setIsLoading(true);
      setError(null);
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE_URL}/machines?page=${page}&limit=${limit}${searchParam}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch machines');
      }
      const data: MachinesResponse = await response.json();
      const machinesArray = Array.isArray(data.results) ? data.results : [];
      setMachines(machinesArray);
      setTotalResults(data.totalResults || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch machines');
      setMachines([]);
      setTotalPages(1);
      toast.error('Failed to load machines');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines(currentPage, itemsPerPage, searchQuery);
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMachines([]);
    } else {
      setSelectedMachines(filteredMachines.map(machine => getMachineId(machine)));
    }
    setSelectAll(!selectAll);
  };

  const handleMachineSelect = (machineId: string) => {
    if (selectedMachines.includes(machineId)) {
      setSelectedMachines(selectedMachines.filter(id => id !== machineId));
    } else {
      setSelectedMachines([...selectedMachines, machineId]);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this machine?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/machines/${id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete machine');
        }

        // Remove the deleted machine from the local state
        setMachines(prevMachines => prevMachines.filter(machine => getMachineId(machine) !== id));
        // Remove from selected machines if it was selected
        setSelectedMachines(prev => prev.filter(selectedId => selectedId !== id));
        
        toast.success('Machine deleted successfully');
      } catch (err) {
        console.error('Error deleting machine:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to delete machine');
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMachines.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedMachines.length} selected machine(s)?`)) {
      try {
        let hasError = false;
        const deletePromises = selectedMachines.map(async (id) => {
          try {
            const response = await fetch(`${API_BASE_URL}/machines/${id}`, {
              method: 'DELETE',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || `Failed to delete machine: ${id}`);
            }
            return id;
          } catch (err) {
            hasError = true;
            console.error(`Error deleting machine ${id}:`, err);
            return null;
          }
        });

        const results = await Promise.all(deletePromises);
        const successfulDeletes = results.filter((id): id is string => id !== null);

        // Remove successfully deleted machines from the local state
        setMachines(prevMachines => 
          prevMachines.filter(machine => !successfulDeletes.includes(getMachineId(machine)))
        );
        
        // Clear selected machines
        setSelectedMachines([]);
        setSelectAll(false);

        if (hasError) {
          toast.error('Some machines could not be deleted');
        } else {
          toast.success('Selected machines deleted successfully');
        }
      } catch (err) {
        console.error('Error in bulk delete:', err);
        toast.error('Failed to delete some machines');
      }
    }
  };

  // Filter machines based on search query
  const filteredMachines = machines.filter(machine =>
    machine.machineCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.machineNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.floor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.needleSize.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate current machines for the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMachines = filteredMachines.slice(startIndex, endIndex);

  const handleExport = async () => {
    try {
      // Always fetch all machines for export
      const response = await fetch(`${API_BASE_URL}/machines?page=1&limit=100000`);
      if (!response.ok) throw new Error('Failed to fetch all machines for export');
      const data = await response.json();
      const exportSource = Array.isArray(data.results) ? data.results : [];
      const exportData = exportSource.map((machine: Machine) => ({
        'ID': getMachineId(machine),
        'Machine Code': machine.machineCode,
        'Machine Number': machine.machineNumber,
        'Needle Size': machine.needleSize,
        'Model': machine.model,
        'Floor': machine.floor,
        'Installation Date': machine.installationDate ? new Date(machine.installationDate).toLocaleDateString() : '',
        'Maintenance Requirement': machine.maintenanceRequirement,
        'Status': machine.status,
        'Assigned Supervisor': machine.assignedSupervisor ? machine.assignedSupervisor.name : '',
        'Capacity Per Shift': machine.capacityPerShift || 0,
        'Capacity Per Day': machine.capacityPerDay || 0,
        'Last Maintenance Date': machine.lastMaintenanceDate ? new Date(machine.lastMaintenanceDate).toLocaleDateString() : '',
        'Next Maintenance Date': machine.nextMaintenanceDate ? new Date(machine.nextMaintenanceDate).toLocaleDateString() : '',
        'Maintenance Notes': machine.maintenanceNotes || ''
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, 
        { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, 
        { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Machines');
      const fileName = `machines_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Machines exported successfully');
    } catch (error) {
      console.error('Error exporting machines:', error);
      toast.error('Failed to export machines');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportProgress(0);
    const loadingToast = toast.loading('Importing machines...');
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
          let successCount = 0;
          let errorCount = 0;
          
          // Fetch all machines for upsert by machine code
          const allResponse = await fetch(`${API_BASE_URL}/machines?page=1&limit=100000`);
          const allData = allResponse.ok ? await allResponse.json() : { results: [] };
          const allMachines: Machine[] = allData.results || [];
          
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const machineData = {
                machineCode: row['Machine Code'],
                machineNumber: row['Machine Number'],
                needleSize: row['Needle Size'],
                model: row['Model'],
                floor: row['Floor'],
                installationDate: row['Installation Date'] ? new Date(row['Installation Date']).toISOString() : undefined,
                maintenanceRequirement: row['Maintenance Requirement'],
                status: (row['Status']?.toString() === 'Active') ? 'Active' : 
                       (row['Status']?.toString() === 'Under Maintenance') ? 'Under Maintenance' : 'Idle',
                assignedSupervisor: row['Assigned Supervisor'] || undefined,
                capacityPerShift: row['Capacity Per Shift'] ? Number(row['Capacity Per Shift']) : undefined,
                capacityPerDay: row['Capacity Per Day'] ? Number(row['Capacity Per Day']) : undefined,
                lastMaintenanceDate: row['Last Maintenance Date'] ? new Date(row['Last Maintenance Date']).toISOString() : undefined,
                nextMaintenanceDate: row['Next Maintenance Date'] ? new Date(row['Next Maintenance Date']).toISOString() : undefined,
                maintenanceNotes: row['Maintenance Notes'] || undefined
              };
              
              let machineId = row['ID'];
              if (!machineId) {
                // Try to find by machine code
                const found = allMachines.find(m => m.machineCode === machineData.machineCode);
                if (found) machineId = getMachineId(found);
              }
              
              if (machineId) {
                // Update existing
                const patchResponse = await fetch(`${API_BASE_URL}/machines/${machineId}`, {
                  method: 'PATCH',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(machineData),
                });
                if (!patchResponse.ok) throw new Error();
                successCount++;
              } else {
                // Create new
                const postResponse = await fetch(`${API_BASE_URL}/machines`, {
                  method: 'POST',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(machineData),
                });
                if (!postResponse.ok) throw new Error();
                successCount++;
              }
            } catch (error) {
              errorCount++;
            }
            setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} machines`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} machines`);
          fetchMachines();
        } catch (error) {
          setImportProgress(null);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      setImportProgress(null);
      toast.error('Failed to import machines', { id: loadingToast });
    }
  };

  // Condensed pagination helper
  function getPagination(currentPage: number, totalPages: number) {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push('...');
      for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'Active': 'bg-success/10 text-success',
      'Under Maintenance': 'bg-warning/10 text-warning',
      'Idle': 'bg-gray-100 text-gray-500'
    };
    return statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Machines"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Machines</h1>
                <HelpIcon
                  title="Machines Management"
                  content={
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                        <p className="text-gray-700">
                          This is the Machines Management page where you can view, manage, and organize all your production machines and equipment in the system.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>View Machines:</strong> Browse all machines with pagination and search functionality</li>
                          <li><strong>Add New Machine:</strong> Click "Add New Machine" to create a new machine entry</li>
                          <li><strong>Edit Machines:</strong> Click the edit icon next to any machine to modify its details</li>
                          <li><strong>Delete Machines:</strong> Remove individual machines or bulk delete selected ones</li>
                          <li><strong>Search & Filter:</strong> Use the search bar to find specific machines by name, code, type, manufacturer, or location</li>
                          <li><strong>Export Data:</strong> Export all machines to Excel format</li>
                          <li><strong>Import Data:</strong> Import machines from Excel files</li>
                          <li><strong>Bulk Operations:</strong> Select multiple machines for bulk deletion</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Machine Information:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Machine Details:</strong> Code, number, model, floor, and needle size</li>
                          <li><strong>Status Tracking:</strong> Active, Under Maintenance, or Idle status</li>
                          <li><strong>Supervisor Assignment:</strong> Track assigned supervisors for each machine</li>
                          <li><strong>Maintenance Schedule:</strong> Track last and next maintenance dates</li>
                          <li><strong>Installation Information:</strong> Record installation dates and maintenance requirements</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Data Fields:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Machine:</strong> Shows machine code, number, and model in one column</li>
                          <li><strong>Floor:</strong> Floor location of the machine (required)</li>
                          <li><strong>Needle Size:</strong> Needle size specification (required)</li>
                          <li><strong>Status:</strong> Current operational status (Active, Under Maintenance, Idle)</li>
                          <li><strong>Supervisor:</strong> Supervisor responsible for the machine</li>
                          <li><strong>Installation Date:</strong> Date when machine was installed</li>
                          <li><strong>Maintenance Requirement:</strong> Maintenance frequency requirement</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Tips:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li>Use descriptive machine codes for easy identification</li>
                          <li>Keep machine codes and numbers unique and consistent</li>
                          <li>Update maintenance dates regularly for proper scheduling</li>
                          <li>Set appropriate status to reflect current machine condition</li>
                          <li>Assign supervisors to machines for better management</li>
                          <li>Export machines before making bulk changes</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              </div>
              <div className="box-tools flex items-center space-x-2">
                {selectedMachines.length > 0 && (
                  <button 
                    type="button" 
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i> 
                    Delete Selected ({selectedMachines.length})
                  </button>
                )}
                {/* Import/Export Buttons */}
                <div className="relative group">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleImport}
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-success"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="ri-upload-2-line me-2"></i> Import
                  </button>
                </div>
                {importProgress !== null && (
                  <div className="w-40 h-3 bg-gray-200 rounded-full overflow-hidden flex items-center ml-2">
                    <div
                      className="bg-primary h-full transition-all duration-200"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                    <span className="ml-2 text-xs text-gray-700">{importProgress}%</span>
                  </div>
                )}
                <button
                  type="button"
                  className="ti-btn ti-btn-primary"
                  onClick={handleExport}
                >
                  <i className="ri-download-2-line me-2"></i> Export
                </button>
                <Link href="/catalog/machines/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New Machine
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search Bar */}
              <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <div className="flex items-center">
                  <label className="mr-2 text-sm text-gray-600">Rows per page:</label>
                  <select
                    className="form-select w-auto text-sm"
                    value={itemsPerPage}
                    onChange={e => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
                <div className="relative w-full max-w-xs">
                  <input
                    type="text"
                    className="form-control py-3 pr-10"
                    placeholder="Search by machine code, number, model, floor, or needle size..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  <i className="ri-error-warning-line text-3xl mb-2"></i>
                  <p>{error}</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table whitespace-nowrap table-bordered min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th scope="col" className="!text-start">
                          <input 
                            type="checkbox" 
                            className="form-check-input" 
                            checked={selectAll}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th scope="col" className="text-start">Machine</th>
                        <th scope="col" className="text-start">Floor</th>
                        <th scope="col" className="text-start">Needle Size</th>
                        <th scope="col" className="text-start">Status</th>
                        <th scope="col" className="text-start">Supervisor</th>
                        <th scope="col" className="text-start">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMachines.length > 0 ? (
                        currentMachines.map((machine: Machine, index: number) => (
                          <tr 
                            key={getMachineId(machine)} 
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                          >
                            <td>
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={selectedMachines.includes(getMachineId(machine))}
                                onChange={() => handleMachineSelect(getMachineId(machine))}
                              />
                            </td>
                            <td>
                              <div className="space-y-1">
                                <div className="font-medium text-gray-900">
                                  <span className="text-gray-500">Code:</span> {machine.machineCode}
                                </div>
                                <div className="text-sm text-gray-600">
                                  <span className="text-gray-500">Number:</span> {machine.machineNumber}
                                </div>
                                <div className="text-sm text-gray-500">
                                  <span className="text-gray-500">Model:</span> {machine.model}
                                </div>
                              </div>
                            </td>
                            <td>{machine.floor}</td>
                            <td>{machine.needleSize}</td>
                            <td>
                              <span className={`badge ${getStatusBadge(machine.status)}`}>
                                {machine.status}
                              </span>
                            </td>
                            <td>{machine.assignedSupervisor?.name || 'Not Assigned'}</td>
                            <td>
                              <div className="flex space-x-2">
                                <Link 
                                  href={`/catalog/machines/edit/${getMachineId(machine)}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button 
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(getMachineId(machine))}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                                <i className="ri-settings-3-line text-4xl text-primary"></i>
                              </div>
                              <h3 className="text-xl font-medium mb-2">No Machines Found</h3>
                              <p className="text-gray-500 text-center mb-6">Start by adding your first machine.</p>
                              <Link href="/catalog/machines/add" className="ti-btn ti-btn-primary">
                                <i className="ri-add-line me-2"></i> Add First Machine
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!isLoading && !error && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {totalResults === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
                  </div>
                  <nav aria-label="Page navigation" className="">
                    <ul className="flex flex-wrap items-center">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </button>
                      </li>
                      {getPagination(currentPage, totalPages).map((page, idx) =>
                        page === '...'
                          ? <li key={"ellipsis-" + idx} className="page-item"><span className="px-3">...</span></li>
                          : <li key={page} className="page-item">
                              <button
                                className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                  currentPage === page 
                                  ? 'bg-primary text-white hover:bg-primary-dark' 
                                  : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                }`}
                                onClick={() => setCurrentPage(Number(page))}
                              >
                                {page}
                              </button>
                            </li>
                      )}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MachinesPage;
