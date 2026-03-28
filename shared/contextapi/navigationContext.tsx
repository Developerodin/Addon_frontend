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
    'Dispatch Floor': boolean;
    'Machine Floor': boolean;
    'Warehouse Floor': boolean;
  };
  'Yarn Management': {
    'Dashboard': boolean;
    'Cataloguing': boolean;
    'Purchase Order': boolean;
    'Purchase Order Received': boolean;
    'Inventory': boolean;
    'Yarn Issue': boolean;
    'Yarn Return': boolean;
    'Yarn Master': {
      'Brand': boolean;
      'Yarn Type': boolean;
      'Count/Size': boolean;
      'Color': boolean;
      'Blend': boolean;
    };
    'Purchase Management': {
      'Requisition list': boolean;
      'Purchase Order': boolean;
      'Purchase Order Recevied': boolean;
      'Yarn QC': boolean;
      'Yarn Storage': boolean;
    };
  };
  'Warehouse Management': {
    'Orders': boolean;
    'Inward': boolean;
    'Pick&Pack': boolean;
    'Layout': boolean;
    'Stock': boolean;
    'Reports': boolean;
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
    'Style Codes': false,
    'Style Code Pairs': false,
    Machines: false,
    'Needle Configuration': false,
    'Team Master': false,
    'Containers Master': false,
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
    'Silicon Floor': false,
    'Secondary Checking Floor': false,
    'Branding Floor': false,
    'Final Checking Floor': false,
    'Dispatch Floor': false,
    'Machine Floor': false,
    'Warehouse Floor': false,
  },
  'Yarn Management': {
    'Dashboard': false,
    'Cataloguing': false,
    'Purchase Order': false,
    'Purchase Order Received': false,
    'Inventory': false,
    'Yarn Issue': false,
    'Yarn Return': false,
    'Yarn Master': {
      'Brand': false,
      'Yarn Type': false,
      'Count/Size': false,
      'Color': false,
      'Blend': false,
    },
    'Purchase Management': {
      'Requisition list': false,
      'Purchase Order': false,
      'Purchase Order Recevied': false,
      'Yarn QC': false,
      'Yarn Storage': false,
    },
  },
  'Warehouse Management': {
    'Orders': false,
    'Inward': false,
    'Pick&Pack': false,
    'Layout': false,
    'Stock': false,
    'Reports': false,
  },
  'Vendor PO': {
    'Vendor List': false,
    'Vendor PO Raise': false,
    'Vendor PO Receive': false,
    'Secondary Checking': false,
    'Washing': false,
    'Boarding': false,
    'Branding': false,
    'Final Checking': false,
    'Dispatch': false,
    'Counting & Dispatch': false,
    'GRN': false,
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
          ...(user.navigation['Yarn Management'] || {}),
          'Yarn Master': {
            ...defaultPermissions['Yarn Management']['Yarn Master'],
            ...(user.navigation['Yarn Management']?.['Yarn Master'] || {})
          },
          'Purchase Management': {
            ...defaultPermissions['Yarn Management']['Purchase Management'],
            ...(user.navigation['Yarn Management']?.['Purchase Management'] || {})
          }
        },
        'Warehouse Management': {
          ...defaultPermissions['Warehouse Management'],
          ...(user.navigation['Warehouse Management'] || {})
        },
        'Vendor PO': {
          ...defaultPermissions['Vendor PO'],
          ...(user.navigation['Vendor PO'] || {})
        },
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
      '/vendor-po': 'Vendor PO',
    };

    const permissionKey = pathMap[path];
    if (permissionKey && typeof permissions[permissionKey] === 'boolean') {
      return permissions[permissionKey] as boolean;
    }

    // Special handling for Vendor PO main menu - show if any Vendor PO permission is true
    if (path === '/vendor-po') {
      const vendorPO = (permissions as any)['Vendor PO'];
      if (vendorPO && typeof vendorPO === 'object') {
        return Object.values(vendorPO).some((permission: any) => permission === true);
      }
      return false;
    }

    /** Vendor PO → Purchase Management hub (vendors + PO + receive) */
    if (path === '/vendor-po/purchase-management') {
      const vendorPO = (permissions as any)['Vendor PO'];
      if (vendorPO && typeof vendorPO === 'object') {
        return ['Vendor List', 'Vendor PO Raise', 'Vendor PO Receive'].some(
          (key) => vendorPO[key] === true
        );
      }
      return false;
    }

    // Special handling for yarn-master path
    if (path === '/yarn-management/yarn-master') {
      const yarnManagement = permissions['Yarn Management'];
      if (yarnManagement && typeof yarnManagement === 'object') {
        const yarnMaster = (yarnManagement as any)['Yarn Master'];
        if (yarnMaster && typeof yarnMaster === 'object') {
          return Object.values(yarnMaster).some((permission: any) => permission === true);
        }
      }
      return false;
    }

    // Special handling for purchase-management path
    if (path === '/yarn-management/purchase-management') {
      const yarnManagement = permissions['Yarn Management'];
      if (yarnManagement && typeof yarnManagement === 'object') {
        const purchaseManagement = (yarnManagement as any)['Purchase Management'];
        if (purchaseManagement && typeof purchaseManagement === 'object') {
          return Object.values(purchaseManagement).some((permission: any) => permission === true);
        }
      }
      return false;
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
        // For Yarn Management, also check nested Yarn Master permissions
        if (subMenuKey === 'Yarn Management') {
          const yarnMgmt = subMenuPermissions as any;
          // Check direct permissions (Cataloguing, Purchase Order, etc.)
          const hasDirectPermission = Object.entries(yarnMgmt)
            .filter(([key]) => key !== 'Yarn Master')
            .some(([, value]) => value === true);
          
          // Check Yarn Master permissions
          const yarnMaster = yarnMgmt['Yarn Master'];
          const hasYarnMasterPermission = yarnMaster && typeof yarnMaster === 'object' 
            ? Object.values(yarnMaster).some((permission: any) => permission === true)
            : false;
          
          // Check Purchase Management permissions
          const purchaseManagement = yarnMgmt['Purchase Management'];
          const hasPurchaseManagementPermission = purchaseManagement && typeof purchaseManagement === 'object' 
            ? Object.values(purchaseManagement).some((permission: any) => permission === true)
            : false;
          
          return hasDirectPermission || hasYarnMasterPermission || hasPurchaseManagementPermission;
        }
        return Object.values(subMenuPermissions).some(permission => permission === true);
      }
    }

    return false;
  };

  // Check if user has permission for a sub-menu item
  const hasSubPermission = (parent: string, child: string): boolean => {
    if (!permissions) return false;

    // Handle Yarn Master sub-items (Brand, Yarn Type, etc.) - nested permissions
    if (parent === '/yarn-management/yarn-master') {
      const yarnManagement = permissions['Yarn Management'];
      if (yarnManagement && typeof yarnManagement === 'object') {
        const yarnMaster = (yarnManagement as any)['Yarn Master'];
        if (yarnMaster && typeof yarnMaster === 'object') {
          return yarnMaster[child] === true;
        }
      }
      return false;
    }

    /** Vendor PO → Purchase Management nested routes map to existing Vendor PO keys */
    if (parent === '/vendor-po/purchase-management') {
      const vendorPO = (permissions as any)['Vendor PO'];
      if (vendorPO && typeof vendorPO === 'object') {
        const keyMap: Record<string, string> = {
          'Vendor List': 'Vendor List',
          'Purchase Order': 'Vendor PO Raise',
          'Purchase Order Received': 'Vendor PO Receive',
        };
        const permKey = keyMap[child] ?? child;
        return vendorPO[permKey] === true;
      }
      return false;
    }

    // Handle Purchase Management sub-items - nested permissions
    if (parent === '/yarn-management/purchase-management') {
      const yarnManagement = permissions['Yarn Management'];
      if (yarnManagement && typeof yarnManagement === 'object') {
        const purchaseManagement = (yarnManagement as any)['Purchase Management'];
        if (purchaseManagement && typeof purchaseManagement === 'object') {
          const hasPermission = purchaseManagement[child] === true;
          // Debug logging
          if (!hasPermission) {
            console.log('Purchase Management permission check:', {
              parent,
              child,
              purchaseManagement,
              hasPermission: purchaseManagement[child]
            });
          }
          return hasPermission;
        }
      }
      console.log('Purchase Management structure not found:', {
        parent,
        child,
        yarnManagement: permissions['Yarn Management']
      });
      return false;
    }

    // Map parent paths to permission objects
    const parentMap: { [key: string]: keyof NavigationPermissions } = {
      '/catalog': 'Catalog',
      '/sales': 'Sales',
      '/production': 'Production Planning',
      '/yarn-management': 'Yarn Management',
      '/warehouse-management': 'Warehouse Management',
      '/vendor-po': 'Vendor PO',
    };

    const parentKey = parentMap[parent];
    if (parentKey && permissions[parentKey] && typeof permissions[parentKey] === 'object') {
      const subPermissions = permissions[parentKey] as any;
      
      // Handle nested permissions (e.g., Yarn Master, Purchase Management)
      if (parent === '/yarn-management' && child === 'Yarn Master') {
        // Check if user has any Yarn Master permission
        const yarnMaster = subPermissions['Yarn Master'];
        if (yarnMaster && typeof yarnMaster === 'object') {
          return Object.values(yarnMaster).some((permission: any) => permission === true);
        }
        return false;
      }
      
      if (parent === '/yarn-management' && child === 'Purchase Management') {
        // Check if user has any Purchase Management permission
        const purchaseManagement = subPermissions['Purchase Management'];
        if (purchaseManagement && typeof purchaseManagement === 'object') {
          return Object.values(purchaseManagement).some((permission: any) => permission === true);
        }
        return false;
      }
      
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
