"use client"

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import Image from 'next/image';
import * as XLSX from 'xlsx';

interface ProcessStep {
  stepTitle: string;
  stepDescription: string;
  duration: number;
}

interface Process {
  id: string;
  name: string;
  type: string;
  description: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  image?: string;
  steps: ProcessStep[];
}

interface ExcelRow {
  'Process Name': string;
  'Description'?: string;
  'Type': string;
  'Sort Order'?: string | number;
  'Status'?: string;
  'Steps (Title | Description | Duration)'?: string; // Format: "Step1 Title|Step1 Desc|30, Step2 Title|Step2 Desc|45"
}

const ProcessesPage = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch processes from API
  const fetchProcesses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('https://addon-backend.onrender.com/v1/processes', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch processes');
      }

      const data = await response.json();
      console.log('Processes data:', data);
      
      // Check if data is in the expected format (array of processes)
      const processesArray = Array.isArray(data.results) ? data.results : [];
      setProcesses(processesArray);
    } catch (err) {
      console.error('Error fetching processes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch processes');
      toast.error('Failed to load processes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProcesses([]);
    } else {
      setSelectedProcesses(filteredProcesses.map(proc => proc.id));
    }
    setSelectAll(!selectAll);
  };

  const handleProcessSelect = (processId: string) => {
    if (selectedProcesses.includes(processId)) {
      setSelectedProcesses(selectedProcesses.filter(id => id !== processId));
    } else {
      setSelectedProcesses([...selectedProcesses, processId]);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this process?')) {
      const loadingToast = toast.loading('Deleting process...');
      try {
        const response = await fetch(`https://addon-backend.onrender.com/v1/processes/${id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete process');
        }

        // Remove the deleted process from the local state
        setProcesses(prevProcesses => prevProcesses.filter(proc => proc.id !== id));
        // Remove from selected processes if it was selected
        setSelectedProcesses(prev => prev.filter(selectedId => selectedId !== id));
        
        toast.success('Process deleted successfully', { id: loadingToast });
      } catch (err) {
        console.error('Error deleting process:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to delete process', { id: loadingToast });
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProcesses.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedProcesses.length} selected process(es)?`)) {
      const loadingToast = toast.loading(`Deleting ${selectedProcesses.length} processes...`);
      try {
        let hasError = false;
        const deletePromises = selectedProcesses.map(async (id) => {
          try {
            const response = await fetch(`https://addon-backend.onrender.com/v1/processes/${id}`, {
              method: 'DELETE',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || `Failed to delete process: ${id}`);
            }
            return id;
          } catch (err) {
            hasError = true;
            console.error(`Error deleting process ${id}:`, err);
            return null;
          }
        });

        const results = await Promise.all(deletePromises);
        const successfulDeletes = results.filter((id): id is string => id !== null);

        // Remove successfully deleted processes from the local state
        setProcesses(prevProcesses => 
          prevProcesses.filter(proc => !successfulDeletes.includes(proc.id))
        );
        
        // Clear selected processes
        setSelectedProcesses([]);
        setSelectAll(false);

        if (hasError) {
          toast.error('Some processes could not be deleted', { id: loadingToast });
        } else {
          toast.success(`Successfully deleted ${successfulDeletes.length} processes`, { id: loadingToast });
        }
      } catch (err) {
        console.error('Error in bulk delete:', err);
        toast.error('Failed to delete processes', { id: loadingToast });
      }
    }
  };

  // Filter processes based on search query
  const filteredProcesses = processes.filter(process =>
    process.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    process.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredProcesses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProcesses = filteredProcesses.slice(startIndex, endIndex);

  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = processes.map(process => ({
        'Process Name': process.name,
        'Description': process.description || '',
        'Type': process.type,
        'Sort Order': process.sortOrder,
        'Status': process.status,
        'Steps (Title | Description | Duration)': process.steps
          .map(step => `${step.stepTitle}|${step.stepDescription}|${step.duration}`)
          .join(', ')
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add column widths
      const colWidths = [
        { wch: 20 }, // Process Name
        { wch: 30 }, // Description
        { wch: 15 }, // Type
        { wch: 10 }, // Sort Order
        { wch: 10 }, // Status
        { wch: 50 }, // Steps
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Processes');

      // Generate file name with timestamp
      const fileName = `processes_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
      toast.success('Processes exported successfully');
    } catch (error) {
      console.error('Error exporting processes:', error);
      toast.error('Failed to export processes');
    }
  };

  const handleExportTemplate = () => {
    try {
      // Create sample data
      const sampleData = [
        {
          'Process Name': 'Assembly Process',
          'Description': 'Main assembly line process',
          'Type': 'Assembly',
          'Sort Order': 1,
          'Status': 'active',
          'Steps (Title | Description | Duration)': 'Prepare Parts|Gather all components|15, Assembly|Put components together|45, Quality Check|Verify assembly|20'
        },
        {
          'Process Name': 'Quality Control',
          'Description': 'Quality inspection process',
          'Type': 'Quality Control',
          'Sort Order': 2,
          'Status': 'active',
          'Steps (Title | Description | Duration)': 'Visual Inspection|Check for visible defects|10, Measurement|Verify dimensions|15, Testing|Perform quality tests|30'
        }
      ];

      // Create worksheet with sample data
      const ws = XLSX.utils.json_to_sheet(sampleData);

      // Add column widths
      const colWidths = [
        { wch: 20 }, // Process Name
        { wch: 30 }, // Description
        { wch: 15 }, // Type
        { wch: 10 }, // Sort Order
        { wch: 10 }, // Status
        { wch: 50 }, // Steps
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Process Template');

      // Save template file
      XLSX.writeFile(wb, 'process_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading('Importing processes...');
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

          for (const row of jsonData) {
            try {
              // Parse steps from the Excel format
              const stepsString = row['Steps (Title | Description | Duration)'] || '';
              const steps = stepsString.split(',').map(stepStr => {
                const [stepTitle = '', stepDescription = '', duration = '0'] = stepStr.trim().split('|');
                return {
                  stepTitle: stepTitle.trim(),
                  stepDescription: stepDescription.trim(),
                  duration: parseInt(duration.trim()) || 0
                };
              }).filter(step => step.stepTitle); // Only include steps with a title

              const processData = {
                name: row['Process Name'],
                description: row['Description'] || '',
                type: row['Type'],
                sortOrder: parseInt(row['Sort Order']?.toString() || '0'),
                status: (row['Status']?.toString()?.toLowerCase() === 'active') ? 'active' : 'inactive',
                steps: steps.length > 0 ? steps : [] // Use parsed steps or empty array
              };

              const response = await fetch('https://addon-backend.onrender.com/v1/processes', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(processData),
              });

              if (!response.ok) {
                throw new Error(`Failed to import process: ${row['Process Name']}`);
              }

              successCount++;
            } catch (error) {
              console.error('Error importing process:', error);
              errorCount++;
            }
          }

          // Clear the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }

          // Show results
          toast.dismiss(loadingToast);
          if (successCount > 0) {
            toast.success(`Successfully imported ${successCount} processes`);
          }
          if (errorCount > 0) {
            toast.error(`Failed to import ${errorCount} processes`);
          }

          // Refresh the processes list
          fetchProcesses();
        } catch (error) {
          console.error('Error processing file:', error);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error importing processes:', error);
      toast.error('Failed to import processes', { id: loadingToast });
    }
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Processes"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Processes</h1>
              <div className="box-tools flex items-center space-x-2">
                {selectedProcesses.length > 0 && (
                  <button 
                    type="button" 
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i> 
                    Delete Selected ({selectedProcesses.length})
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
                  <div className="hidden group-hover:block absolute z-50 w-72 p-4 mt-2 bg-white rounded-lg shadow-lg border border-gray-200">
                    <h6 className="text-sm font-semibold mb-2">Import Format:</h6>
                    <p className="text-xs text-gray-600 mb-2">Excel file with columns:</p>
                    <ul className="text-xs text-gray-600 list-disc list-inside mb-2">
                      <li>Process Name (required)</li>
                      <li>Description</li>
                      <li>Type (required)</li>
                      <li>Sort Order</li>
                      <li>Status (active/inactive)</li>
                      <li>Steps (Title|Description|Duration, ...)</li>
                    </ul>
                    <button
                      type="button"
                      className="text-xs text-primary hover:text-primary-dark"
                      onClick={handleExportTemplate}
                    >
                      Download Template
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="ti-btn ti-btn-success"
                  onClick={handleExport}
                >
                  <i className="ri-download-2-line me-2"></i> Export
                </button>

                <Link href="/catalog/processes/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New Process
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    className="form-control py-3"
                    placeholder="Search by process name or type..."
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
                        <th scope="col" className="text-start">Process Name</th>
                        <th scope="col" className="text-start">Type</th>
                        <th scope="col" className="text-start">Steps</th>
                        <th scope="col" className="text-start">Sort Order</th>
                        <th scope="col" className="text-start">Status</th>
                        <th scope="col" className="text-start">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentProcesses.length > 0 ? (
                        currentProcesses.map((process, index) => (
                          <tr 
                            key={process.id} 
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                          >
                            <td>
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={selectedProcesses.includes(process.id)}
                                onChange={() => handleProcessSelect(process.id)}
                              />
                            </td>
                            <td>
                              <div className="flex items-center space-x-3">
                                {process.image && (
                                  <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                                    <Image
                                      src={process.image}
                                      alt={process.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                                <span>{process.name}</span>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-primary/10 text-primary">
                                {process.type}
                              </span>
                            </td>
                            <td>{process.steps.length} steps</td>
                            <td>{process.sortOrder}</td>
                            <td>
                              <span className={`badge ${process.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                {process.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex space-x-2">
                                <Link 
                                  href={`/catalog/processes/edit/${process.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                  title="Edit Process"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button 
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(process.id)}
                                  title="Delete Process"
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                                <i className="ri-settings-line text-4xl text-primary"></i>
                              </div>
                              <h3 className="text-xl font-medium mb-2">No Processes Found</h3>
                              <p className="text-gray-500 text-center mb-6">Start by adding your first process.</p>
                              <Link href="/catalog/processes/add" className="ti-btn ti-btn-primary">
                                <i className="ri-add-line me-2"></i> Add First Process
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
              {!isLoading && !error && filteredProcesses.length > itemsPerPage && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredProcesses.length)} of {filteredProcesses.length} entries
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
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <li key={page} className="page-item">
                          <button
                            className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                              currentPage === page 
                              ? 'bg-primary text-white hover:bg-primary-dark' 
                              : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </li>
                      ))}
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

export default ProcessesPage; 