import { API_BASE_URL } from '@/shared/data/utilities/api';

/** Needle size a machine supports, with its short-close cutoff quantity. */
export interface MachineNeedleSizeConfig {
  needleSize: string;
  cutoffQuantity?: number;
}

/**
 * Machine status. The API returns the title-case values (`Active`, `Idle`,
 * `Under Maintenance`); the lower-case values are legacy and still accepted by
 * older screens in this app.
 */
export type MachineStatus =
  | 'Active'
  | 'Idle'
  | 'Under Maintenance'
  | 'active'
  | 'inactive'
  | 'maintenance'
  | 'retired';

export interface Machine {
  id: string;
  name: string;
  machineCode: string;
  /** Physical machine number from the catalog, distinct from machineCode. */
  machineNumber?: string;
  machineType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: MachineStatus;
  location: string;
  capacity: number;
  /** Needle sizes this machine can run; a machine may support several. */
  needleSizeConfig?: MachineNeedleSizeConfig[];
  description?: string;
  purchaseDate?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MachinesResponse {
  results: Machine[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface CreateMachineData {
  name: string;
  machineCode: string;
  machineType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: 'active' | 'inactive' | 'maintenance' | 'retired';
  location: string;
  capacity: number;
  description?: string;
  purchaseDate?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
}

export interface UpdateMachineData extends Partial<CreateMachineData> {
  id: string;
}

class MachinesService {
  private baseUrl = `${API_BASE_URL}/machines`;

  /**
   * Fetch all machines with pagination and search
   */
  async getMachines(page: number = 1, limit: number = 10, search: string = ''): Promise<MachinesResponse> {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const response = await fetch(`${this.baseUrl}?page=${page}&limit=${limit}${searchParam}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch machines');
    }

    return response.json();
  }

  /**
   * Fetch a single machine by ID
   */
  async getMachine(id: string): Promise<Machine> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch machine');
    }

    return response.json();
  }

  /**
   * Create a new machine
   */
  async createMachine(machineData: CreateMachineData): Promise<Machine> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(machineData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create machine');
    }

    return response.json();
  }

  /**
   * Update an existing machine
   */
  async updateMachine(id: string, machineData: Partial<CreateMachineData>): Promise<Machine> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(machineData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update machine');
    }

    return response.json();
  }

  /**
   * Delete a machine
   */
  async deleteMachine(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
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
  }

  /**
   * Bulk delete machines
   */
  async bulkDeleteMachines(ids: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = await Promise.allSettled(
      ids.map(id => this.deleteMachine(id))
    );

    const success: string[] = [];
    const failed: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        success.push(ids[index]);
      } else {
        failed.push(ids[index]);
      }
    });

    return { success, failed };
  }

  /**
   * Export machines to Excel format
   */
  async exportMachines(): Promise<Machine[]> {
    const response = await this.getMachines(1, 100000);
    return response.results;
  }

  /**
   * Get machine types for dropdown/select options
   */
  async getMachineTypes(): Promise<string[]> {
    try {
      const response = await this.getMachines(1, 100000);
      const types = [...new Set(response.results.map(machine => machine.machineType))];
      return types.filter(type => type && type.trim() !== '');
    } catch (error) {
      console.error('Error fetching machine types:', error);
      return [];
    }
  }

  /**
   * Get manufacturers for dropdown/select options
   */
  async getManufacturers(): Promise<string[]> {
    try {
      const response = await this.getMachines(1, 100000);
      const manufacturers = [...new Set(response.results.map(machine => machine.manufacturer))];
      return manufacturers.filter(manufacturer => manufacturer && manufacturer.trim() !== '');
    } catch (error) {
      console.error('Error fetching manufacturers:', error);
      return [];
    }
  }

  /**
   * Get locations for dropdown/select options
   */
  async getLocations(): Promise<string[]> {
    try {
      const response = await this.getMachines(1, 100000);
      const locations = [...new Set(response.results.map(machine => machine.location))];
      return locations.filter(location => location && location.trim() !== '');
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }

  /**
   * Get machines by status
   */
  async getMachinesByStatus(status: string): Promise<Machine[]> {
    try {
      const response = await this.getMachines(1, 100000);
      return response.results.filter(machine => machine.status === status);
    } catch (error) {
      console.error('Error fetching machines by status:', error);
      return [];
    }
  }

  /**
   * Get machines requiring maintenance (next maintenance date is due or overdue)
   */
  async getMachinesRequiringMaintenance(): Promise<Machine[]> {
    try {
      const response = await this.getMachines(1, 100000);
      const today = new Date();
      return response.results.filter(machine => {
        if (!machine.nextMaintenanceDate) return false;
        const nextMaintenance = new Date(machine.nextMaintenanceDate);
        return nextMaintenance <= today;
      });
    } catch (error) {
      console.error('Error fetching machines requiring maintenance:', error);
      return [];
    }
  }

  /**
   * Update machine status
   */
  async updateMachineStatus(id: string, status: 'active' | 'inactive' | 'maintenance' | 'retired'): Promise<Machine> {
    return this.updateMachine(id, { status });
  }

  /**
   * Update machine maintenance dates
   */
  async updateMaintenanceDates(
    id: string, 
    lastMaintenanceDate?: string, 
    nextMaintenanceDate?: string
  ): Promise<Machine> {
    const updateData: Partial<CreateMachineData> = {};
    if (lastMaintenanceDate) updateData.lastMaintenanceDate = lastMaintenanceDate;
    if (nextMaintenanceDate) updateData.nextMaintenanceDate = nextMaintenanceDate;
    
    return this.updateMachine(id, updateData);
  }
}

export const machinesService = new MachinesService();
export default machinesService;
