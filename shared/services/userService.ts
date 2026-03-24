import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

// User interface based on the provided schema
export interface NavigationPermissions {
  // Main Sidebar
  Dashboard: boolean;
  Catalog: {
    Items: boolean;
    Categories: boolean;
    'Raw Material': boolean;
    Processes: boolean;
    Attributes: boolean;
    'Style Codes': boolean;
    'Style Code Pairs': boolean;
    Machines: boolean;
    'Needle Configuration': boolean;
    'Team Master': boolean;
    'Containers Master': boolean;
  };
  Sales: {
    'All Sales': boolean;
    'Master Sales': boolean;
  };
  Stores: boolean;
  Analytics: boolean;
  'Replenishment Agent': boolean;
  'File Manager': boolean;
  Users: boolean;
  'Production Planning': {
    'Production Orders': boolean;
    'Knitting Floor': boolean;
    'Linking Floor': boolean;
    'Checking Floor': boolean;
    'Washing Floor': boolean;
    'Boarding Floor': boolean;
    'Silicon Floor': boolean;
    'Secondary Checking Floor': boolean;
    'Branding Floor': boolean;
    'Final Checking Floor': boolean;
    'Machine Floor': boolean;
    'Warehouse Floor': boolean;
  };
  'Yarn Management': {
    Dashboard: boolean;
    Inventory: boolean;
    Cataloguing: boolean;
    'Purchase Management': {
      'Requisition list': boolean;
      'Purchase Order': boolean;
      'Purchase Order Recevied': boolean;
      'Yarn QC': boolean;
      'Yarn Storage': boolean;
    };
    'Yarn Issue': boolean;
    'Yarn Return': boolean;
    'Yarn Master': {
      Brand: boolean;
      'Yarn Type': boolean;
      'Count/Size': boolean;
      Color: boolean;
      Blend: boolean;
    };
  };
  'Warehouse Management': {
    Orders: boolean;
    'Pick&Pack': boolean;
    Layout: boolean;
    Stock: boolean;
    Reports: boolean;
  };
  'Vendor PO': {
    'Vendor List': boolean;
    'Vendor PO Raise': boolean;
    'Vendor PO Receive': boolean;
    'Secondary Checking': boolean;
    'Washing': boolean;
    'Boarding': boolean;
    'Branding': boolean;
    'Final Checking': boolean;
    'Dispatch': boolean;
    'Counting & Dispatch': boolean;
    'GRN': boolean;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Only included when creating/updating
  phoneNumber?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  gender: 'Male' | 'Female' | 'Other';
  country?: string;
  timezone: string;
  role: 'admin' | 'user' | 'super_admin';
  navigation: NavigationPermissions;
  createdAt: string;
  updatedAt: string;
}

// Create user request interface
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'super_admin';
  phoneNumber?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  country?: string;
  timezone?: string;
}

// Update user request interface
export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  phoneNumber?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  country?: string;
  timezone?: string;
  role?: 'admin' | 'user' | 'super_admin';
}

// Update navigation request interface
export interface UpdateNavigationRequest {
  navigation: Partial<NavigationPermissions>;
}

// Pagination response interface
export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

// Users query parameters
export interface UsersQueryParams {
  role?: 'admin' | 'user' | 'super_admin';
  limit?: number;
  page?: number;
  sortBy?: string;
  search?: string;
}

// Helper function to get access token from cookies
const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null; // Server-side check
  
  try {
    // First try js-cookie library
    const tokenFromJsCookie = Cookies.get('accessToken');
    if (tokenFromJsCookie) {
      return tokenFromJsCookie;
    }

    // Fallback to manual cookie parsing
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'accessToken') {
        const token = decodeURIComponent(value);
        return token;
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading access token from cookies:', error);
    return null;
  }
};

class UserService {
  private baseURL = `${API_BASE_URL}/users`;

  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const token = getAccessToken();

      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('User API Error:', error);
      throw error;
    }
  }

  // Get all users with pagination and filters
  async getUsers(params?: UsersQueryParams): Promise<PaginatedResponse<User>> {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append('role', params.role);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const result = await this.makeRequest<PaginatedResponse<User>>(`${query}`);
    console.log('Get users API response:', result);
    return result;
  }

  // Get single user by ID
  async getUser(userId: string): Promise<User> {
    if (!userId || userId === 'undefined') {
      throw new Error('Invalid user ID provided');
    }
    const result = await this.makeRequest<User>(`/${userId}`);
    console.log('Get user API response:', result);
    return result;
  }

  // Create new user
  async createUser(userData: CreateUserRequest): Promise<User> {
    const result = await this.makeRequest<User>('', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    console.log('Create user API response:', result);
    return result;
  }

  // Update user
  async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    if (!userId || userId === 'undefined') {
      throw new Error('Invalid user ID provided');
    }
    const result = await this.makeRequest<User>(`/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
    console.log('Update user API response:', result);
    return result;
  }

  // Update user navigation permissions
  async updateUserNavigation(userId: string, navigationData: UpdateNavigationRequest): Promise<User> {
    if (!userId || userId === 'undefined') {
      throw new Error('Invalid user ID provided');
    }
    console.log('Sending navigation data:', navigationData);
    const result = await this.makeRequest<User>(`/${userId}/navigation`, {
      method: 'PATCH',
      body: JSON.stringify(navigationData),
    });
    console.log('Update user navigation API response:', result);
    return result;
  }

  // Delete user
  async deleteUser(userId: string): Promise<void> {
    if (!userId || userId === 'undefined') {
      throw new Error('Invalid user ID provided');
    }
    await this.makeRequest<void>(`/${userId}`, {
      method: 'DELETE',
    });
    console.log('Delete user API response: success');
  }

  // Utility functions
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'super_admin':
        return 'text-red-600 bg-red-100';
      case 'admin':
        return 'text-blue-600 bg-blue-100';
      case 'user':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getGenderIcon(gender: string): string {
    switch (gender) {
      case 'Male':
        return 'ri-men-line text-blue-600';
      case 'Female':
        return 'ri-women-line text-pink-600';
      case 'Other':
        return 'ri-user-line text-gray-600';
      default:
        return 'ri-user-line text-gray-600';
    }
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!password.match(/\d/)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!password.match(/[a-zA-Z]/)) {
      errors.push('Password must contain at least one letter');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const userService = new UserService();
