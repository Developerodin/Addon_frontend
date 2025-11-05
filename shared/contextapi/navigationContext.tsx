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
    'Machine Floor': boolean;
  };
  'Yarn Management': {
    'Cataloguing': boolean;
    'Purchase': boolean;
    'Inventory': boolean;
    'Yarn Issue': boolean;
  };
  'Warehouse Management': {
    'Orders': boolean;
    'Pick&Pack': boolean;
    'Layout': boolean;
    'Stock': boolean;
    'Reports': boolean;
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
    'Machine Floor': false,
  },
  'Yarn Management': {
    'Cataloguing': false,
    'Purchase': false,
    'Inventory': false,
    'Yarn Issue': false,
  },
  'Warehouse Management': {
    'Orders': false,
    'Pick&Pack': false,
    'Layout': false,
    'Stock': false,
    'Reports': false,
  },
};

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [permissions, setPermissions] = useState<NavigationPermissions | null>(() => {
    // Initialize with cached permissions if available
    if (typeof window !== 'undefined') {
      const cachedPermissions = localStorage.getItem('navigationPermissions');
      if (cachedPermissions) {
        try {
          return JSON.parse(cachedPermissions);
        } catch (error) {
          console.error('Failed to parse cached permissions on init:', error);
        }
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    // If we have cached permissions, don't show loading initially
    if (typeof window !== 'undefined') {
      const cachedPermissions = localStorage.getItem('navigationPermissions');
      return !cachedPermissions;
    }
    return true;
  });
  
  // Get user from Redux store
  const user = useSelector((state: any) => state.auth?.user);

  useEffect(() => {
    console.log('Navigation context - User data:', user);
    console.log('Navigation context - User navigation:', user?.navigation);
    
    // Clear cache if no user (logout scenario)
    if (!user) {
      localStorage.removeItem('navigationPermissions');
      localStorage.removeItem('cachedUserId');
      setPermissions(defaultPermissions);
      setIsLoading(false);
      return;
    }
    
    // If user exists, try to load permissions
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
        },
        'Yarn Management': {
          ...defaultPermissions['Yarn Management'],
          ...(user.navigation['Yarn Management'] || {})
        },
        'Warehouse Management': {
          ...defaultPermissions['Warehouse Management'],
          ...(user.navigation['Warehouse Management'] || {})
        }
      };
      setPermissions(mergedPermissions);
      // Cache permissions for faster loading on refresh
      localStorage.setItem('navigationPermissions', JSON.stringify(mergedPermissions));
      localStorage.setItem('cachedUserId', user.id);
      setIsLoading(false);
    } else if (user) {
      // User exists but no navigation permissions - check cache first
      const cachedPermissions = localStorage.getItem('navigationPermissions');
      const cachedUserId = localStorage.getItem('cachedUserId');
      
      if (cachedPermissions && cachedUserId === user.id) {
        try {
          const parsedPermissions = JSON.parse(cachedPermissions);
          setPermissions(parsedPermissions);
          console.log('Using cached permissions for user without navigation data');
          setIsLoading(false);
          return;
        } catch (error) {
          console.error('Failed to parse cached permissions:', error);
        }
      }
      
      // No cache or cache failed - use secure defaults
      console.log('User exists but no navigation permissions found, using secure defaults');
      const securePermissions = {
        ...defaultPermissions,
        Dashboard: true, // Always show dashboard for authenticated users
      };
      setPermissions(securePermissions);
      // Cache permissions for faster loading on refresh
      localStorage.setItem('navigationPermissions', JSON.stringify(securePermissions));
      localStorage.setItem('cachedUserId', user.id);
      setIsLoading(false);
    } else {
      // No user - use completely secure defaults
      console.log('No user found, using secure defaults');
      setPermissions(defaultPermissions);
      // Cache permissions for faster loading on refresh
      localStorage.setItem('navigationPermissions', JSON.stringify(defaultPermissions));
      setIsLoading(false);
    }
  }, [user]);

  // Check if user has permission for a main menu item
  const hasPermission = (path: string): boolean => {
    if (!permissions) return false;
    
    // Map paths to permission keys
    const pathMap: { [key: string]: keyof NavigationPermissions } = {
      '/users': 'Users',
      '/dashboard': 'Dashboard',
      '/dashboards/main': 'Dashboard',
      '/stores': 'Stores',
      '/analytics': 'Analytics',
      '/replenishment': 'Replenishment Agent',
      '/filemanager': 'File Manager',
    };

    const permissionKey = pathMap[path];
    if (permissionKey && typeof permissions[permissionKey] === 'boolean') {
      return permissions[permissionKey] as boolean;
    }

    // Special handling for sub-menus - check if user has any permission for the sub-menu
    if (path === '/catalog' || path === '/sales' || path === '/production' || path === '/yarn-management' || path === '/warehouse-management') {
      let subMenuKey: keyof NavigationPermissions;
      if (path === '/catalog') subMenuKey = 'Catalog';
      else if (path === '/sales') subMenuKey = 'Sales';
      else if (path === '/production') subMenuKey = 'Production Planning';
      else if (path === '/yarn-management') subMenuKey = 'Yarn Management';
      else if (path === '/warehouse-management') subMenuKey = 'Warehouse Management';
      else return false;
      
      const subMenuPermissions = permissions[subMenuKey];
      if (subMenuPermissions && typeof subMenuPermissions === 'object') {
        // Check if user has any permission for this sub-menu
        return Object.values(subMenuPermissions).some(permission => permission === true);
      }
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
      '/yarn-management': 'Yarn Management',
      '/warehouse-management': 'Warehouse Management',
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
