"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { User } from '@/shared/services/userService';

interface NavigationPermissions {
  // Main Sidebar
  Dashboard: boolean;
  Catalog: {
    Items: boolean;
    Categories: boolean;
    'Raw Material': boolean;
    Processes: boolean;
    Attributes: boolean;
    Machines: boolean;
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
    'Final Checking Floor': boolean;
    'Branding Floor': boolean;
    'Warehouse Floor': boolean;
  };
}

interface NavigationContextType {
  permissions: NavigationPermissions | null;
  hasPermission: (path: string) => boolean;
  hasSubPermission: (parent: string, child: string) => boolean;
  isLoading: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Default permissions (all false for security)
const defaultPermissions: NavigationPermissions = {
  Dashboard: false,
  Catalog: {
    Items: false,
    Categories: false,
    'Raw Material': false,
    Processes: false,
    Attributes: false,
    Machines: false,
  },
  Sales: {
    'All Sales': false,
    'Master Sales': false,
  },
  Stores: false,
  Analytics: false,
  'Replenishment Agent': false,
  'File Manager': false,
  Users: false,
  'Production Planning': {
    'Production Orders': false,
    'Knitting Floor': false,
    'Linking Floor': false,
    'Checking Floor': false,
    'Washing Floor': false,
    'Boarding Floor': false,
    'Final Checking Floor': false,
    'Branding Floor': false,
    'Warehouse Floor': false,
  },
};

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [permissions, setPermissions] = useState<NavigationPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get user from Redux store
  const user = useSelector((state: any) => state.auth?.user);

  useEffect(() => {
    console.log('Navigation context - User data:', user);
    console.log('Navigation context - User navigation:', user?.navigation);
    
    if (user && user.navigation) {
      console.log('Setting navigation permissions from user:', user.navigation);
      // Merge with default permissions to ensure all keys exist
      const mergedPermissions = {
        ...defaultPermissions,
        ...user.navigation,
        // Ensure nested objects are properly merged
        Catalog: {
          ...defaultPermissions.Catalog,
          ...(user.navigation.Catalog || {})
        },
        Sales: {
          ...defaultPermissions.Sales,
          ...(user.navigation.Sales || {})
        },
        'Production Planning': {
          ...defaultPermissions['Production Planning'],
          ...(user.navigation['Production Planning'] || {})
        }
      };
      setPermissions(mergedPermissions);
    } else {
      console.log('No user or navigation data found, using default permissions');
      // For development/testing, let's enable some basic permissions
      const devPermissions = {
        ...defaultPermissions,
        Dashboard: true, // Always show dashboard
        Users: true, // Show users for testing
        Stores: true, // Show stores for testing
        Analytics: true, // Show analytics for testing
        'File Manager': true, // Show file manager for testing
        'Replenishment Agent': true, // Show replenishment for testing
        Catalog: {
          Items: true,
          Categories: true,
          'Raw Material': true,
          Processes: true,
          Attributes: true,
          Machines: true,
        },
        Sales: {
          'All Sales': true,
          'Master Sales': true,
        },
        'Production Planning': {
          'Production Orders': true,
          'Knitting Floor': true,
          'Linking Floor': true,
          'Checking Floor': true,
          'Washing Floor': true,
          'Boarding Floor': true,
          'Final Checking Floor': true,
          'Branding Floor': true,
          'Warehouse Floor': true,
        }
      };
      setPermissions(devPermissions);
    }
    setIsLoading(false);
  }, [user]);

  // Check if user has permission for a main menu item
  const hasPermission = (path: string): boolean => {
    if (!permissions) return false;
    
    // Map paths to permission keys
    const pathMap: { [key: string]: keyof NavigationPermissions } = {
      '/users': 'Users',
      '/dashboard': 'Dashboard',
      '/stores': 'Stores',
      '/analytics': 'Analytics',
      '/replenishment': 'Replenishment Agent',
      '/filemanager': 'File Manager',
    };

    const permissionKey = pathMap[path];
    if (permissionKey && typeof permissions[permissionKey] === 'boolean') {
      return permissions[permissionKey] as boolean;
    }

    return false;
  };

  // Check if user has permission for a sub-menu item
  const hasSubPermission = (parent: string, child: string): boolean => {
    if (!permissions) return false;

    // Map parent paths to permission objects
    const parentMap: { [key: string]: keyof NavigationPermissions } = {
      '/catalog': 'Catalog',
      '/sales': 'Sales',
      '/production': 'Production Planning',
    };

    const parentKey = parentMap[parent];
    if (parentKey && permissions[parentKey] && typeof permissions[parentKey] === 'object') {
      const subPermissions = permissions[parentKey] as any;
      return subPermissions[child] === true;
    }

    return false;
  };

  const value: NavigationContextType = {
    permissions,
    hasPermission,
    hasSubPermission,
    isLoading,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
