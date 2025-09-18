import { useState, useEffect, useCallback } from 'react';
import { machinesService, Machine, CreateMachineData, UpdateMachineData, MachinesResponse } from '@/shared/services/machinesService';

interface UseMachinesOptions {
  page?: number;
  limit?: number;
  search?: string;
  autoFetch?: boolean;
}

interface UseMachinesReturn {
  // Data
  machines: Machine[];
  currentMachine: Machine | null;
  totalResults: number;
  totalPages: number;
  currentPage: number;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  fetchMachines: (page?: number, limit?: number, search?: string) => Promise<void>;
  fetchMachine: (id: string) => Promise<void>;
  createMachine: (machineData: CreateMachineData) => Promise<Machine | null>;
  updateMachine: (id: string, machineData: Partial<CreateMachineData>) => Promise<Machine | null>;
  deleteMachine: (id: string) => Promise<boolean>;
  bulkDeleteMachines: (ids: string[]) => Promise<{ success: string[], failed: string[] }>;
  
  // Utility functions
  setCurrentPage: (page: number) => void;
  setSearchQuery: (search: string) => void;
  setItemsPerPage: (limit: number) => void;
  clearError: () => void;
  clearCurrentMachine: () => void;
  
  // Filter options
  machineTypes: string[];
  manufacturers: string[];
  locations: string[];
  fetchFilterOptions: () => Promise<void>;
}

export const useMachines = (options: UseMachinesOptions = {}): UseMachinesReturn => {
  const {
    page: initialPage = 1,
    limit: initialLimit = 10,
    search: initialSearch = '',
    autoFetch = true
  } = options;

  // State
  const [machines, setMachines] = useState<Machine[]>([]);
  const [currentMachine, setCurrentMachine] = useState<Machine | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPageState] = useState(initialPage);
  const [itemsPerPage, setItemsPerPageState] = useState(initialLimit);
  const [searchQuery, setSearchQueryState] = useState(initialSearch);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Filter options
  const [machineTypes, setMachineTypes] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  // Fetch machines
  const fetchMachines = useCallback(async (page?: number, limit?: number, search?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const pageToUse = page ?? currentPage;
      const limitToUse = limit ?? itemsPerPage;
      const searchToUse = search ?? searchQuery;
      
      const response: MachinesResponse = await machinesService.getMachines(pageToUse, limitToUse, searchToUse);
      
      setMachines(response.results);
      setTotalResults(response.totalResults);
      setTotalPages(response.totalPages);
      setCurrentPageState(response.page);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch machines';
      setError(errorMessage);
      setMachines([]);
      setTotalResults(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery]);

  // Fetch single machine
  const fetchMachine = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const machine = await machinesService.getMachine(id);
      setCurrentMachine(machine);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch machine';
      setError(errorMessage);
      setCurrentMachine(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create machine
  const createMachine = useCallback(async (machineData: CreateMachineData): Promise<Machine | null> => {
    try {
      setIsCreating(true);
      setError(null);
      
      const newMachine = await machinesService.createMachine(machineData);
      
      // Add to local state
      setMachines(prev => [newMachine, ...prev]);
      setTotalResults(prev => prev + 1);
      
      return newMachine;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create machine';
      setError(errorMessage);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Update machine
  const updateMachine = useCallback(async (id: string, machineData: Partial<CreateMachineData>): Promise<Machine | null> => {
    try {
      setIsUpdating(true);
      setError(null);
      
      const updatedMachine = await machinesService.updateMachine(id, machineData);
      
      // Update in local state
      setMachines(prev => prev.map(machine => 
        machine.id === id ? updatedMachine : machine
      ));
      
      // Update current machine if it's the one being updated
      if (currentMachine?.id === id) {
        setCurrentMachine(updatedMachine);
      }
      
      return updatedMachine;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update machine';
      setError(errorMessage);
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [currentMachine]);

  // Delete machine
  const deleteMachine = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsDeleting(true);
      setError(null);
      
      await machinesService.deleteMachine(id);
      
      // Remove from local state
      setMachines(prev => prev.filter(machine => machine.id !== id));
      setTotalResults(prev => prev - 1);
      
      // Clear current machine if it's the one being deleted
      if (currentMachine?.id === id) {
        setCurrentMachine(null);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete machine';
      setError(errorMessage);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [currentMachine]);

  // Bulk delete machines
  const bulkDeleteMachines = useCallback(async (ids: string[]): Promise<{ success: string[], failed: string[] }> => {
    try {
      setIsDeleting(true);
      setError(null);
      
      const result = await machinesService.bulkDeleteMachines(ids);
      
      // Remove successfully deleted machines from local state
      setMachines(prev => prev.filter(machine => !result.success.includes(machine.id)));
      setTotalResults(prev => prev - result.success.length);
      
      // Clear current machine if it was deleted
      if (currentMachine && result.success.includes(currentMachine.id)) {
        setCurrentMachine(null);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete machines';
      setError(errorMessage);
      return { success: [], failed: ids };
    } finally {
      setIsDeleting(false);
    }
  }, [currentMachine]);

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [types, manufacturersList, locationsList] = await Promise.all([
        machinesService.getMachineTypes(),
        machinesService.getManufacturers(),
        machinesService.getLocations()
      ]);
      
      setMachineTypes(types);
      setManufacturers(manufacturersList);
      setLocations(locationsList);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  }, []);

  // Utility functions
  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageState(page);
  }, []);

  const setSearchQuery = useCallback((search: string) => {
    setSearchQueryState(search);
    setCurrentPageState(1); // Reset to first page when searching
  }, []);

  const setItemsPerPage = useCallback((limit: number) => {
    setItemsPerPageState(limit);
    setCurrentPageState(1); // Reset to first page when changing items per page
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearCurrentMachine = useCallback(() => {
    setCurrentMachine(null);
  }, []);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchMachines();
    }
  }, [autoFetch, fetchMachines]);

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  return {
    // Data
    machines,
    currentMachine,
    totalResults,
    totalPages,
    currentPage,
    
    // Loading states
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    
    // Error state
    error,
    
    // Actions
    fetchMachines,
    fetchMachine,
    createMachine,
    updateMachine,
    deleteMachine,
    bulkDeleteMachines,
    
    // Utility functions
    setCurrentPage,
    setSearchQuery,
    setItemsPerPage,
    clearError,
    clearCurrentMachine,
    
    // Filter options
    machineTypes,
    manufacturers,
    locations,
    fetchFilterOptions
  };
};

export default useMachines;
