import { useState, useEffect, useCallback } from 'react';
import { 
  userService, 
  User, 
  CreateUserRequest,
  UpdateUserRequest,
  UpdateNavigationRequest,
  PaginatedResponse,
  UsersQueryParams
} from '@/shared/services/userService';

interface UsersState {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  } | null;
  filters: {
    role: 'admin' | 'user' | 'accounts' | 'super_admin' | '';
    search: string;
    sortBy: string;
  };
}

export const useUsers = () => {
  const [state, setState] = useState<UsersState>({
    users: [],
    currentUser: null,
    loading: false,
    error: null,
    pagination: null,
    filters: {
      role: '',
      search: '',
      sortBy: 'name:asc'
    }
  });

  // Load users with filters and pagination
  const loadUsers = useCallback(async (params?: UsersQueryParams) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Use provided params or current state
      const queryParams: UsersQueryParams = {
        page: params?.page || 1,
        limit: params?.limit || 20,
        sortBy: params?.sortBy || 'name:asc',
        role: params?.role || undefined,
        search: params?.search || undefined
      };

      const response: PaginatedResponse<User> = await userService.getUsers(queryParams);
      
      console.log('Loaded users data:', response.results);
      console.log('Users navigation data:', response.results.map(user => ({ id: user.id, name: user.name, navigation: user.navigation })));
      
      setState(prev => ({ 
        ...prev, 
        users: response.results,
        pagination: {
          page: response.page,
          limit: response.limit,
          totalPages: response.totalPages,
          totalResults: response.totalResults,
        },
        loading: false 
      }));
    } catch (error) {
      console.error('Failed to load users:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load users',
        loading: false 
      }));
    }
  }, []);


  // Load single user
  const loadUser = useCallback(async (userId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const user = await userService.getUser(userId);
      
      setState(prev => ({ 
        ...prev, 
        currentUser: user,
        loading: false 
      }));
    } catch (error) {
      console.error('Failed to load user:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load user',
        loading: false 
      }));
    }
  }, []);

  // Create user
  const createUser = useCallback(async (userData: CreateUserRequest) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const newUser = await userService.createUser(userData);
      
      // Refresh users list
      await loadUsers();
      
      setState(prev => ({ ...prev, loading: false }));
      return newUser;
    } catch (error) {
      console.error('Failed to create user:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to create user',
        loading: false 
      }));
      throw error;
    }
  }, [loadUsers]);

  // Update user
  const updateUser = useCallback(async (userId: string, userData: UpdateUserRequest) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const updatedUser = await userService.updateUser(userId, userData);
      
      // Update user in the list
      setState(prev => ({
        ...prev,
        users: prev.users.map(user => 
          user.id === userId ? updatedUser : user
        ),
        currentUser: prev.currentUser?.id === userId ? updatedUser : prev.currentUser,
        loading: false
      }));
      
      // Refresh the users list to ensure data consistency
      await loadUsers();
      
      return updatedUser;
    } catch (error) {
      console.error('Failed to update user:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update user',
        loading: false 
      }));
      throw error;
    }
  }, [loadUsers]);

  // Update user navigation
  const updateUserNavigation = useCallback(async (userId: string, navigationData: UpdateNavigationRequest) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const updatedUser = await userService.updateUserNavigation(userId, navigationData);
      
      console.log('Updated user navigation for user:', userId);
      console.log('Updated user navigation data:', updatedUser.navigation);
      
      // Update user in the list
      setState(prev => ({
        ...prev,
        users: prev.users.map(user => 
          user.id === userId ? updatedUser : user
        ),
        currentUser: prev.currentUser?.id === userId ? updatedUser : prev.currentUser,
        loading: false
      }));
      
      // Refresh the users list to ensure data consistency
      await loadUsers();
      
      return updatedUser;
    } catch (error) {
      console.error('Failed to update user navigation:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update user navigation',
        loading: false 
      }));
      throw error;
    }
  }, [loadUsers]);

  // Delete user
  const deleteUser = useCallback(async (userId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      await userService.deleteUser(userId);
      
      // Remove user from the list
      setState(prev => ({
        ...prev,
        users: prev.users.filter(user => user.id !== userId),
        currentUser: prev.currentUser?.id === userId ? null : prev.currentUser,
        loading: false
      }));
      
      // Refresh the users list to ensure data consistency
      await loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete user',
        loading: false 
      }));
      throw error;
    }
  }, [loadUsers]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<UsersState['filters']>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  }, []);

  // Search users
  const searchUsers = useCallback((query: string) => {
    updateFilters({ search: query });
  }, [updateFilters]);

  // Filter by role
  const filterByRole = useCallback((role: 'admin' | 'user' | 'accounts' | 'super_admin' | '') => {
    updateFilters({ role });
  }, [updateFilters]);

  // Sort users
  const sortUsers = useCallback((sortBy: string) => {
    updateFilters({ sortBy });
  }, [updateFilters]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {
        role: '',
        search: '',
        sortBy: 'name:asc'
      }
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Clear current user
  const clearCurrentUser = useCallback(() => {
    setState(prev => ({ ...prev, currentUser: null }));
  }, []);

  // Initialize
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    // State
    ...state,
    
    // Actions
    loadUsers,
    loadUser,
    createUser,
    updateUser,
    updateUserNavigation,
    deleteUser,
    updateFilters,
    searchUsers,
    filterByRole,
    sortUsers,
    clearFilters,
    clearError,
    clearCurrentUser,
    
    // Utility functions
    formatDate: userService.formatDate,
    formatDateTime: userService.formatDateTime,
    getRoleColor: userService.getRoleColor,
    getGenderIcon: userService.getGenderIcon,
    validateEmail: userService.validateEmail,
    validatePassword: userService.validatePassword,
  };
};
