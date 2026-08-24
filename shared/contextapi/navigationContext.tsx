"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { User } from '@/shared/services/userService';

export type DashboardNavPermissions = {
  'Catalog Dashboard': boolean;
  'Production Dashboard': boolean;
  'Vendor Dashboard': boolean;
  'Yarn Dashboard': boolean;
};

interface NavigationPermissions {
  // Main Sidebar
  Dashboard: DashboardNavPermissions;
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
  'Help & Support': boolean;
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
    'Re-Boarding Floor': boolean;
    'Final Checking Floor': boolean;
    'Dispatch Floor': boolean;
    'M4 Management': boolean;
    'M2 Management': boolean;
    'M3 Management': boolean;
    'Machine Floor': boolean;
    'Warehouse Floor': boolean;
  };
  'Yarn Management': {
    'Dashboard': boolean;
    'Cataloguing': boolean;
    'Purchase Order': boolean;
    'Purchase Order Received': boolean;
    'Inventory': boolean;
    'Analytics & reports': boolean;
    'Purchase Management': {
      'Requisition list': boolean;
      'Purchase Order': boolean;
      'Purchase Order Recevied': boolean;
      'Draft POs': boolean;
      'PO Return': boolean;
      'PO Return Challan': boolean;
      'GRN History': boolean;
      'Yarn QC': boolean;
      'Yarn Storage': boolean;
      'Yarn to Vendor': boolean;
    };
    'Yarn Issue': {
      'Issue for orders': boolean;
      'Linking & sampling': boolean;
    };
    'Yarn Return': boolean;
    'Yarn Master': {
      'Brand': boolean;
      'Yarn Type': boolean;
      'Count/Size': boolean;
      'Color': boolean;
      'Blend': boolean;
    };
  };
  'Warehouse Management': {
    'Orders': boolean;
    'Inward': boolean;
    'Clients': boolean;
    'Pick&Pack': boolean;
    'Scanning': boolean;
    'Billing': boolean;
    'Dispatch': boolean;
    'Returns': boolean;
    'Layout': boolean;
    'Stock': boolean;
    'Reports': boolean;
  };
  'Vendor PO': {
    'Vendor List': boolean;
    'Vendor PO Raise': boolean;
    'Vendor PO Receive': boolean;
    'Secondary Checking': boolean;
    'Branding': boolean;
    'Final Checking': boolean;
    'Dispatch': boolean;
    'M2 Management': boolean;
    'M3 Management': boolean;
    'M4 Management': boolean;
    'Counting & Dispatch': boolean;
    'GRN': boolean;
    'Vendor PO Return': boolean;
    'Vendor PO Return Challan': boolean;
  };
}

/**
 * Whether Help & Support nav is explicitly enabled for this user.
 * @param permissions - Merged navigation permissions from context
 */
export function canAccessHelpSupport(
  permissions: { 'Help & Support'?: boolean } | null | undefined
): boolean {
  return permissions?.['Help & Support'] === true;
}

interface NavigationContextType {
  permissions: NavigationPermissions | null;
  hasPermission: (path: string) => boolean;
  hasSubPermission: (parent: string, child: string) => boolean;
  isLoading: boolean;
}

/**
 * Normalizes legacy boolean `Yarn Issue` flags and partial objects from the API into the nested shape.
 */
export function mergeYarnIssuePermissions(
  raw: boolean | NavigationPermissions['Yarn Management']['Yarn Issue'] | undefined,
  defaults: NavigationPermissions['Yarn Management']['Yarn Issue']
): NavigationPermissions['Yarn Management']['Yarn Issue'] {
  if (raw === true) {
    return { 'Issue for orders': true, 'Linking & sampling': true };
  }
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, boolean | undefined>;
    const linkingSampling =
      Boolean(r['Linking & sampling']) || Boolean(r.Linking) || Boolean(r.Sampling);
    return {
      ...defaults,
      'Issue for orders': Boolean(r['Issue for orders']),
      'Linking & sampling': linkingSampling,
    };
  }
  return { ...defaults };
}

/** Nested Dashboard flags — all off. */
export const EMPTY_DASHBOARD_NAV_DEFAULTS: DashboardNavPermissions = {
  'Catalog Dashboard': false,
  'Production Dashboard': false,
  'Vendor Dashboard': false,
  'Yarn Dashboard': false,
};

/** Nested Dashboard flags — all on (legacy `Dashboard: true` and missing-nav fallback). */
export const ALL_DASHBOARD_NAV_DEFAULTS: DashboardNavPermissions = {
  'Catalog Dashboard': true,
  'Production Dashboard': true,
  'Vendor Dashboard': true,
  'Yarn Dashboard': true,
};

/**
 * Normalizes legacy boolean `Dashboard` flags and partial objects into the nested shape.
 * @param raw - Stored Dashboard permission (boolean or object)
 * @param defaults - Fallback nested flags
 */
export function mergeDashboardPermissions(
  raw: boolean | DashboardNavPermissions | undefined,
  defaults: DashboardNavPermissions
): DashboardNavPermissions {
  if (raw === true) {
    return { ...ALL_DASHBOARD_NAV_DEFAULTS };
  }
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, boolean | undefined>;
    return {
      ...defaults,
      'Catalog Dashboard': Boolean(r['Catalog Dashboard']),
      'Production Dashboard': Boolean(r['Production Dashboard']),
      'Vendor Dashboard': Boolean(r['Vendor Dashboard']),
      'Yarn Dashboard': Boolean(r['Yarn Dashboard']),
    };
  }
  return { ...defaults };
}

/**
 * True if the user may see the Dashboard sidebar group (any nested flag or legacy boolean).
 * @param dashboard - Dashboard permission value from navigation
 */
export function hasAnyDashboardAccess(
  dashboard: boolean | DashboardNavPermissions | undefined
): boolean {
  if (dashboard === true) return true;
  if (dashboard && typeof dashboard === 'object') {
    return Object.values(dashboard).some((value) => value === true);
  }
  return false;
}

/**
 * Deep-merge partial navigation with canonical defaults for complete PATCH payloads.
 * @param partial - User navigation from API or form state
 * @returns Full navigation object aligned with backend schema
 */
export function mergeNavigationWithDefaults(
  partial: Partial<NavigationPermissions> | undefined
): NavigationPermissions {
  if (!partial) {
    return { ...defaultPermissions };
  }

  return {
    ...defaultPermissions,
    ...partial,
    Dashboard: mergeDashboardPermissions(
      partial.Dashboard as boolean | DashboardNavPermissions | undefined,
      defaultPermissions.Dashboard
    ),
    Catalog: {
      ...defaultPermissions.Catalog,
      ...(partial.Catalog || {}),
    },
    Sales: {
      ...defaultPermissions.Sales,
      ...(partial.Sales || {}),
    },
    'Production Planning': {
      ...defaultPermissions['Production Planning'],
      ...(partial['Production Planning'] || {}),
    },
    'Yarn Management': {
      ...defaultPermissions['Yarn Management'],
      ...(partial['Yarn Management'] || {}),
      'Yarn Master': {
        ...defaultPermissions['Yarn Management']['Yarn Master'],
        ...(partial['Yarn Management']?.['Yarn Master'] || {}),
      },
      'Purchase Management': {
        ...defaultPermissions['Yarn Management']['Purchase Management'],
        ...(partial['Yarn Management']?.['Purchase Management'] || {}),
      },
      'Yarn Issue': mergeYarnIssuePermissions(
        partial['Yarn Management']?.['Yarn Issue'] as
          | boolean
          | NavigationPermissions['Yarn Management']['Yarn Issue']
          | undefined,
        defaultPermissions['Yarn Management']['Yarn Issue']
      ),
    },
    'Warehouse Management': {
      ...defaultPermissions['Warehouse Management'],
      ...(partial['Warehouse Management'] || {}),
    },
    'Vendor PO': {
      ...defaultPermissions['Vendor PO'],
      ...(partial['Vendor PO'] || {}),
    },
  };
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Default permissions (all false for security)
const defaultPermissions: NavigationPermissions = {
  Dashboard: { ...EMPTY_DASHBOARD_NAV_DEFAULTS },
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
  'Help & Support': false,
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
    'Re-Boarding Floor': false,
    'Final Checking Floor': false,
    'Dispatch Floor': false,
    'M4 Management': false,
    'M2 Management': false,
    'M3 Management': false,
    'Machine Floor': false,
    'Warehouse Floor': false,
  },
  'Yarn Management': {
    'Dashboard': false,
    'Cataloguing': false,
    'Purchase Order': false,
    'Purchase Order Received': false,
    'Inventory': false,
    'Analytics & reports': false,
    'Purchase Management': {
      'Requisition list': false,
      'Purchase Order': false,
      'Purchase Order Recevied': false,
      'Draft POs': false,
      'PO Return': false,
      'PO Return Challan': false,
      'GRN History': false,
      'Yarn QC': false,
      'Yarn Storage': false,
      'Yarn to Vendor': false,
    },
    'Yarn Issue': {
      'Issue for orders': false,
      'Linking & sampling': false,
    },
    'Yarn Return': false,
    'Yarn Master': {
      'Brand': false,
      'Yarn Type': false,
      'Count/Size': false,
      'Color': false,
      'Blend': false,
    },
  },
  'Warehouse Management': {
    'Orders': false,
    'Inward': false,
    'Clients': false,
    'Pick&Pack': false,
    'Scanning': false,
    'Billing': false,
    'Dispatch': false,
    'Returns': false,
    'Layout': false,
    'Stock': false,
    'Reports': false,
  },
  'Vendor PO': {
    'Vendor List': false,
    'Vendor PO Raise': false,
    'Vendor PO Receive': false,
    'Secondary Checking': false,
    'Branding': false,
    'Final Checking': false,
    'Dispatch': false,
    'M2 Management': false,
    'M3 Management': false,
    'M4 Management': false,
    'Counting & Dispatch': false,
    'GRN': false,
    'Vendor PO Return': false,
    'Vendor PO Return Challan': false,
  },
};

/** Defaults for Yarn Issue submenu keys — used when normalizing legacy user documents. */
export const EMPTY_YARN_ISSUE_NAV_DEFAULTS = defaultPermissions['Yarn Management']['Yarn Issue'];

const NAVIGATION_CACHE_KEY = 'navigationPermissions';
const NAVIGATION_CACHE_VERSION_KEY = 'navigationPermissionsVersion';
/** Bump when permission semantics change (e.g. Help & Support opt-in). */
const NAVIGATION_CACHE_VERSION = '4';

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [permissions, setPermissions] = useState<NavigationPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const user = useSelector((state: any) => state.auth?.user);
  const authInitialized = useSelector((state: any) => state.auth?.authInitialized);

  useEffect(() => {
    if (!authInitialized) {
      setIsLoading(true);
      return;
    }

    console.log('Navigation context - User data:', user);
    console.log('Navigation context - User navigation:', user?.navigation);

    // Clear cache if no user (logout or expired session)
    if (!user) {
      localStorage.removeItem(NAVIGATION_CACHE_KEY);
      localStorage.removeItem('cachedUserId');
      localStorage.removeItem(NAVIGATION_CACHE_VERSION_KEY);
      setPermissions(null);
      setIsLoading(false);
      return;
    }
    
    // If user exists, try to load permissions
    if (user && user.navigation) {
      console.log('Setting navigation permissions from user:', user.navigation);
      const mergedPermissions = mergeNavigationWithDefaults(user.navigation);
      setPermissions(mergedPermissions);
      localStorage.setItem(NAVIGATION_CACHE_KEY, JSON.stringify(mergedPermissions));
      localStorage.setItem('cachedUserId', user.id);
      localStorage.setItem(NAVIGATION_CACHE_VERSION_KEY, NAVIGATION_CACHE_VERSION);
      setIsLoading(false);
    } else if (user) {
      const cachedPermissions = localStorage.getItem(NAVIGATION_CACHE_KEY);
      const cachedUserId = localStorage.getItem('cachedUserId');
      const cacheVersion = localStorage.getItem(NAVIGATION_CACHE_VERSION_KEY);
      
      if (
        cachedPermissions &&
        cachedUserId === user.id &&
        cacheVersion === NAVIGATION_CACHE_VERSION
      ) {
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
        Dashboard: { ...ALL_DASHBOARD_NAV_DEFAULTS },
      };
      setPermissions(securePermissions);
      localStorage.setItem(NAVIGATION_CACHE_KEY, JSON.stringify(securePermissions));
      localStorage.setItem('cachedUserId', user.id);
      localStorage.setItem(NAVIGATION_CACHE_VERSION_KEY, NAVIGATION_CACHE_VERSION);
      setIsLoading(false);
    } else {
      console.log('No user found, using secure defaults');
      setPermissions(defaultPermissions);
      localStorage.setItem(NAVIGATION_CACHE_KEY, JSON.stringify(defaultPermissions));
      localStorage.removeItem(NAVIGATION_CACHE_VERSION_KEY);
      setIsLoading(false);
    }
  }, [user, authInitialized]);

  // Check if user has permission for a main menu item
  const hasPermission = (path: string): boolean => {
    if (!permissions) return false;
    
    // Map paths to permission keys
    const pathMap: { [key: string]: keyof NavigationPermissions } = {
      '/users': 'Users',
      '/stores': 'Stores',
      '/analytics': 'Analytics',
      '/replenishment': 'Replenishment Agent',
      '/filemanager': 'File Manager',
      '/help-and-support': 'Help & Support',
      '/vendor-po': 'Vendor PO',
    };

    const permissionKey = pathMap[path];
    if (permissionKey && typeof permissions[permissionKey] === 'boolean') {
      if (path === '/help-and-support') {
        return permissions[permissionKey] === true;
      }
      return permissions[permissionKey] as boolean;
    }

    if (path === '/dashboard' || path === '/dashboards' || path === '/dashboards/main') {
      return hasAnyDashboardAccess(permissions.Dashboard);
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
        return ['Vendor List', 'Vendor PO Raise', 'Vendor PO Receive', 'GRN', 'Vendor PO Return', 'Vendor PO Return Challan'].some(
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

    // Yarn Issue hub (nested submenu: orders / linking / sampling)
    if (path === '/yarn-management/yarn-issue') {
      const yarnManagement = permissions['Yarn Management'];
      if (yarnManagement && typeof yarnManagement === 'object') {
        const yarnIssue = (yarnManagement as any)['Yarn Issue'];
        if (yarnIssue === true) return true;
        if (yarnIssue && typeof yarnIssue === 'object') {
          return Object.values(yarnIssue).some((permission: any) => permission === true);
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
          const hasDirectPermission = Object.entries(yarnMgmt)
            .filter(([key]) =>
              key !== 'Yarn Master' &&
              key !== 'Purchase Management' &&
              key !== 'Yarn Issue'
            )
            .some(([, value]) => value === true);

          const yarnIssue = yarnMgmt['Yarn Issue'];
          const hasYarnIssuePermission =
            yarnIssue === true ||
            (yarnIssue &&
              typeof yarnIssue === 'object' &&
              Object.values(yarnIssue).some((permission: any) => permission === true));

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

          return (
            hasDirectPermission ||
            hasYarnIssuePermission ||
            hasYarnMasterPermission ||
            hasPurchaseManagementPermission
          );
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

    // Yarn Issue sub-routes (orders / linking / sampling)
    if (parent === '/yarn-management/yarn-issue') {
      const yarnManagement = permissions['Yarn Management'];
      if (yarnManagement && typeof yarnManagement === 'object') {
        const yarnIssue = (yarnManagement as any)['Yarn Issue'];
        if (yarnIssue === true) {
          return true;
        }
        if (yarnIssue && typeof yarnIssue === 'object') {
          return yarnIssue[child] === true;
        }
      }
      return false;
    }

    // Map parent paths to permission objects
    if (parent === '/dashboards' || parent === '/dashboards/main' || parent === '/dashboard') {
      const dashboardRaw = permissions.Dashboard as unknown as boolean | DashboardNavPermissions;
      if (dashboardRaw === true) return true;
      if (dashboardRaw && typeof dashboardRaw === 'object') {
        return dashboardRaw[child as keyof DashboardNavPermissions] === true;
      }
      return false;
    }

    const parentMap: { [key: string]: keyof NavigationPermissions } = {
      '/dashboards': 'Dashboard',
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

      if (parent === '/yarn-management' && child === 'Yarn Issue') {
        const yarnIssue = subPermissions['Yarn Issue'];
        if (yarnIssue === true) {
          return true;
        }
        if (yarnIssue && typeof yarnIssue === 'object') {
          return Object.values(yarnIssue).some((permission: any) => permission === true);
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
