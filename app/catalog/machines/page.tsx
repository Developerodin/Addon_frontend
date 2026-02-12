"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import HelpIcon from '@/shared/components/HelpIcon';
import type { NeedleSizeConfigItem } from './types';

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
  'Needle Config'?: string;
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
  'Company'?: string;
  'Machine Type'?: string;
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

  // Helper function to parse dates from Excel in various formats
  const parseDate = (dateValue: any): string | undefined => {
    if (!dateValue) return undefined;
    
    // If it's already a Date object, convert to ISO string
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? undefined : dateValue.toISOString();
    }
    
    // If it's already an ISO string, return it
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? undefined : date.toISOString();
    }
    
    // Convert to string and trim
    const dateStr = String(dateValue).trim();
    if (!dateStr || dateStr === '') return undefined;
    
    // Handle Excel serial date numbers (days since 1900-01-01)
    if (/^\d+\.?\d*$/.test(dateStr)) {
      const serialDate = parseFloat(dateStr);
      if (serialDate > 0 && serialDate < 100000) {
        // Excel serial date: January 1, 1900 is day 1
        // Use UTC to avoid timezone shifts
        const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // December 30, 1899 UTC
        const date = new Date(excelEpoch.getTime() + serialDate * 24 * 60 * 60 * 1000);
        return isNaN(date.getTime()) ? undefined : date.toISOString();
      }
    }
    
    // Try to parse various date formats
    // Pattern for DD-MM-YYYY, DD/MM/YYYY, MM-DD-YYYY, MM/DD/YYYY, YYYY-MM-DD, YYYY/MM/DD
    const datePattern = /^(\d{1,4})[-\/](\d{1,2})[-\/](\d{1,4})$/;
    const match = dateStr.match(datePattern);
    
    if (match) {
      const part1 = parseInt(match[1], 10);
      const part2 = parseInt(match[2], 10);
      const part3 = parseInt(match[3], 10);
      
      let year: number, month: number, day: number;
      
      // Determine format based on part lengths
      if (match[1].length === 4) {
        // YYYY-MM-DD or YYYY/MM/DD format
        year = part1;
        month = part2 - 1; // Month is 0-indexed
        day = part3;
      } else if (match[3].length === 4) {
        // DD-MM-YYYY or DD/MM/YYYY or MM-DD-YYYY or MM/DD/YYYY
        if (part1 > 12) {
          // First part > 12, must be DD-MM-YYYY or DD/MM/YYYY
          day = part1;
          month = part2 - 1; // Month is 0-indexed
          year = part3;
        } else if (part2 > 12) {
          // Second part > 12, must be MM-DD-YYYY or MM/DD/YYYY
          month = part1 - 1; // Month is 0-indexed
          day = part2;
          year = part3;
        } else {
          // Ambiguous: could be DD-MM-YYYY or MM-DD-YYYY
          // Try DD-MM-YYYY first (more common in international formats)
          if (part1 <= 31 && part2 <= 12) {
            day = part1;
            month = part2 - 1;
            year = part3;
          } else {
            // Fallback to MM-DD-YYYY
            month = part1 - 1;
            day = part2;
            year = part3;
          }
        }
      } else {
        // Default to DD-MM-YYYY format
        day = part1;
        month = part2 - 1;
        year = part3;
        // Adjust year if it's 2 digits (assume 2000s)
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }
      }
      
      // Validate and create date at UTC midnight to avoid timezone shifts
      if (year >= 1900 && year <= 2100 && month >= 0 && month < 12 && day >= 1 && day <= 31) {
        // Use Date.UTC to create date at UTC midnight, preventing timezone shifts
        const date = new Date(Date.UTC(year, month, day));
        // Verify the date is valid (handles invalid dates like Feb 30)
        if (!isNaN(date.getTime())) {
          // Double-check the UTC date components match
          const utcYear = date.getUTCFullYear();
          const utcMonth = date.getUTCMonth();
          const utcDay = date.getUTCDate();
          if (utcYear === year && utcMonth === month && utcDay === day) {
            return date.toISOString();
          }
        }
      }
    }
    
    // Try native Date parsing as fallback (only if pattern didn't match)
    // This handles other date formats that don't match our pattern
    if (!datePattern.test(dateStr)) {
      const nativeDate = new Date(dateStr);
      if (!isNaN(nativeDate.getTime())) {
        // Verify it's a reasonable date (not 1970-01-01 for invalid dates)
        const year = nativeDate.getFullYear();
        if (year >= 1900 && year <= 2100) {
          return nativeDate.toISOString();
        }
      }
    }
    
    return undefined;
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
      setSelectedMachines(machines.map(machine => getMachineId(machine)));
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

  // Note: Pagination and search are handled by the API
  // The 'machines' state already contains the paginated results for the current page

  const handleExport = async () => {
    try {
      // Always fetch all machines for export
      const response = await fetch(`${API_BASE_URL}/machines?page=1&limit=100000`);
      if (!response.ok) throw new Error('Failed to fetch all machines for export');
      const data = await response.json();
      const exportSource = Array.isArray(data.results) ? data.results : [];
      const formatNeedleConfig = (config: NeedleSizeConfigItem[] | undefined) => {
        if (!config?.length) return '';
        return config.map(c => `${c.needleSize} (${c.cutoffQuantity})`).join(', ');
      };
      const exportData = exportSource.map((machine: Machine) => ({
        'ID': getMachineId(machine),
        'Machine Code': machine.machineCode,
        'Machine Number': machine.machineNumber,
        'Needle Config': formatNeedleConfig(machine.needleSizeConfig),
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
        'Maintenance Notes': machine.maintenanceNotes || '',
        'Company': machine.company || '',
        'Machine Type': machine.machineType || ''
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, 
        { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, 
        { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
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
          
          const parseNeedleConfig = (str: string | undefined): NeedleSizeConfigItem[] => {
            if (!str?.trim()) return [];
            return str.split(',').map(part => {
              const match = part.trim().match(/^(.+?)\s*\((\d+)\)\s*$/);
              if (match) return { needleSize: match[1].trim(), cutoffQuantity: parseInt(match[2], 10) || 0 };
              const single = part.trim();
              if (single) return { needleSize: single, cutoffQuantity: 0 };
              return null;
            }).filter((x): x is NeedleSizeConfigItem => x !== null);
          };
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const needleConfig = parseNeedleConfig(row['Needle Config']);
              const machineData: Record<string, unknown> = {
                machineCode: row['Machine Code'],
                machineNumber: row['Machine Number'],
                model: row['Model'],
                floor: row['Floor'],
                installationDate: parseDate(row['Installation Date']),
                maintenanceRequirement: row['Maintenance Requirement'],
                status: (row['Status']?.toString() === 'Active') ? 'Active' : 
                       (row['Status']?.toString() === 'Under Maintenance') ? 'Under Maintenance' : 'Idle',
                assignedSupervisor: row['Assigned Supervisor'] || undefined,
                capacityPerShift: row['Capacity Per Shift'] ? Number(row['Capacity Per Shift']) : undefined,
                capacityPerDay: row['Capacity Per Day'] ? Number(row['Capacity Per Day']) : undefined,
                lastMaintenanceDate: parseDate(row['Last Maintenance Date']),
                nextMaintenanceDate: parseDate(row['Next Maintenance Date']),
                maintenanceNotes: row['Maintenance Notes'] || undefined,
                company: row['Company'] || undefined,
                machineType: row['Machine Type'] || undefined
              };
              if (needleConfig.length > 0) machineData.needleSizeConfig = needleConfig;
              
              let machineId = row['ID'];
              if (!machineId) {
                // Try to find by machine code
                const found = allMachines.find(m => m.machineCode === machineData.machineCode);
                if (found) machineId = getMachineId(found);
              }
              
              const body = JSON.stringify(machineData);
              if (machineId) {
                // Update existing
                const patchResponse = await fetch(`${API_BASE_URL}/machines/${machineId}`, {
                  method: 'PATCH',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body,
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
                  body,
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

  const getStatusBadgeClass = (status: string) => {
    const map: Record<string, string> = {
      'Active': 'bg-green-100 text-green-800',
      'Under Maintenance': 'bg-amber-100 text-amber-800',
      'Idle': 'bg-gray-100 text-gray-600'
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title="Machines"/>

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Machines</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Machines Management"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">This is the Machines Management page where you can view, manage, and organize all your production machines and equipment in the system.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><strong>View Machines:</strong> Browse all machines with pagination and search functionality</li>
                        <li><strong>Add New Machine:</strong> Click &quot;Add New Machine&quot; to create a new machine entry</li>
                        <li><strong>Edit Machines:</strong> Click the edit icon next to any machine to modify its details</li>
                        <li><strong>Delete Machines:</strong> Remove individual machines or bulk delete selected ones</li>
                        <li><strong>Search &amp; Filter:</strong> Use the search bar to find specific machines</li>
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
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Tips:</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li>Use descriptive machine codes for easy identification</li>
                        <li>Keep machine codes and numbers unique and consistent</li>
                        <li>Update maintenance dates regularly for proper scheduling</li>
                        <li>Export machines before making bulk changes</li>
                      </ul>
                    </div>
                  </div>
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 transition-all font-medium"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              </div>
              <div className="relative group">
                <select
                  value={itemsPerPage}
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
                >
                  <option value={10}>Show 10</option>
                  <option value={50}>Show 50</option>
                  <option value={100}>Show 100</option>
                  <option value={500}>Show 500</option>
                  <option value={1000}>Show 1000</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm">
                <i className="ri-upload-2-line text-xs"></i> Import
              </button>
              {importProgress !== null && (
                <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden flex items-center">
                  <div className="bg-primary h-full transition-all duration-200" style={{ width: `${importProgress}%` }}></div>
                  <span className="ml-1.5 text-[10px] text-gray-600 font-medium">{importProgress}%</span>
                </div>
              )}
              <button type="button" onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-download-2-line text-xs"></i> Export
              </button>
              {selectedMachines.length > 0 && (
                <button type="button" onClick={handleDeleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors bg-red-50 text-red-600 border-red-100 hover:bg-red-100 shadow-sm">
                  <i className="ri-delete-bin-line text-xs"></i> Delete ({selectedMachines.length})
                </button>
              )}
              <Link href="/catalog/machines/add" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-add-line text-xs"></i> Add Machine
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-error-warning-line text-xl text-red-400"></i>
              </div>
              <p className="text-[12px] font-medium text-red-600">{error}</p>
            </div>
          ) : machines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-settings-3-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              <Link href="/catalog/machines/add" className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-add-line text-xs"></i> Add First Machine
              </Link>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Machine</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Floor</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Needle Config</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Supervisor</th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((machine: Machine) => (
                  <tr key={getMachineId(machine)} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input type="checkbox" checked={selectedMachines.includes(getMachineId(machine))} onChange={() => handleMachineSelect(getMachineId(machine))} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[12px] font-bold text-gray-900">{machine.machineCode}</span>
                        <span className="text-[10px] font-medium text-gray-500">{machine.machineNumber} · {machine.model}</span>
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{machine.floor}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {machine.needleSizeConfig?.length ? (
                        <div className="min-w-[120px]">
                          <table className="w-full text-[10px] border border-gray-100 rounded overflow-hidden">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-1.5 py-1 text-left font-semibold text-gray-600">Size</th>
                                <th className="px-1.5 py-1 text-left font-semibold text-gray-600">Cutoff</th>
                              </tr>
                            </thead>
                            <tbody>
                              {machine.needleSizeConfig.map((c, i) => (
                                <tr key={i} className="border-t border-gray-100">
                                  <td className="px-1.5 py-0.5">{c.needleSize}</td>
                                  <td className="px-1.5 py-0.5">{c.cutoffQuantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${getStatusBadgeClass(machine.status)}`}>{machine.status}</span>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{machine.assignedSupervisor?.name || '—'}</td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Link href={`/catalog/machines/edit/${getMachineId(machine)}`} className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors" title="Edit">
                          <i className="ri-pencil-line text-xs"></i>
                        </Link>
                        <button className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors" onClick={() => handleDelete(getMachineId(machine))} title="Delete">
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && !error && (
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
            <div className="text-[11px] font-medium text-[#495057] tracking-tight">
              Showing <span>{totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {totalResults === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalResults)}</span> of <span>{totalResults}</span> entries <span className="ml-1 opacity-50">→</span>
            </div>
            <div className="flex items-center">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Prev</button>
              <div className="flex items-center gap-1 mx-2">
                {getPagination(currentPage, totalPages).map((page, idx) =>
                  page === '...' ? <span key={`ellipsis-${idx}`} className="text-gray-300 text-[10px]">...</span> : (
                    <button key={page} onClick={() => setCurrentPage(Number(page))} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${currentPage === page ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>{page}</button>
                  )
                )}
              </div>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MachinesPage;
