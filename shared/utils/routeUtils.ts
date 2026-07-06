import { NavigationPermissions } from '@/shared/contextapi/navigationContext';

/**
 * True if user may open Yarn Issue flows for production orders (legacy flat flag or nested key).
 */
function canAccessYarnIssueForOrders(permissions: NavigationPermissions | null): boolean {
  const yi = permissions?.['Yarn Management']?.['Yarn Issue'];
  if (yi === true) return true;
  if (yi && typeof yi === 'object') {
    return (yi as { 'Issue for orders'?: boolean })['Issue for orders'] === true;
  }
  return false;
}

export const getFirstAvailableRoute = (permissions: NavigationPermissions | null): string => {
  if (!permissions) {
    return '/auth/login';
  }

  // Check routes in order of priority
  const routeChecks = [
    { path: '/dashboards/main', permission: permissions.Dashboard }, // Check actual Dashboard permission
    { path: '/catalog/items', permission: permissions.Catalog?.Items },
    { path: '/catalog/categories', permission: permissions.Catalog?.Categories },
    { path: '/catalog/raw-material', permission: permissions.Catalog?.['Raw Material'] },
    { path: '/catalog/style-code-pairs', permission: permissions.Catalog?.['Style Code Pairs'] },
    { path: '/catalog/processes', permission: permissions.Catalog?.Processes },
    { path: '/catalog/attributes', permission: permissions.Catalog?.Attributes },
    { path: '/catalog/machines', permission: permissions.Catalog?.Machines },
    { path: '/catalog/needle-configuration', permission: permissions.Catalog?.['Needle Configuration'] },
    { path: '/catalog/team-master', permission: permissions.Catalog?.['Team Master'] },
    { path: '/catalog/containers-master', permission: permissions.Catalog?.['Containers Master'] },
    { path: '/sales/page', permission: permissions.Sales?.['All Sales'] },
    { path: '/sales/master', permission: permissions.Sales?.['Master Sales'] },
    { path: '/stores', permission: permissions.Stores },
    { path: '/analytics', permission: permissions.Analytics },
    { path: '/replenishment', permission: permissions['Replenishment Agent'] },
    { path: '/filemanager', permission: permissions['File Manager'] },
    { path: '/help-and-support', permission: permissions['Help & Support'] },
    { path: '/users', permission: permissions.Users },
    { path: '/production/supervisor', permission: permissions['Production Planning']?.['Production Orders'] },
    { path: '/production/floor-supervisor/knitting', permission: permissions['Production Planning']?.['Knitting Floor'] },
    { path: '/production/floor-supervisor/linking', permission: permissions['Production Planning']?.['Linking Floor'] },
    { path: '/production/floor-supervisor/checking', permission: permissions['Production Planning']?.['Checking Floor'] },
    { path: '/production/floor-supervisor/washing', permission: permissions['Production Planning']?.['Washing Floor'] },
    { path: '/production/floor-supervisor/boarding', permission: permissions['Production Planning']?.['Boarding Floor'] },
    { path: '/production/floor-supervisor/silicon', permission: permissions['Production Planning']?.['Silicon Floor'] },
    { path: '/production/floor-supervisor/secondary-checking', permission: permissions['Production Planning']?.['Secondary Checking Floor'] },
    { path: '/production/floor-supervisor/branding', permission: permissions['Production Planning']?.['Branding Floor'] },
    { path: '/production/floor-supervisor/re-boarding', permission: permissions['Production Planning']?.['Re-Boarding Floor'] },
    { path: '/production/floor-supervisor/final-checking', permission: permissions['Production Planning']?.['Final Checking Floor'] },
    { path: '/production/floor-supervisor/dispatch', permission: permissions['Production Planning']?.['Dispatch Floor'] },
    { path: '/production/m2-management', permission: permissions['Production Planning']?.['M2 Management'] },
    { path: '/production/m4-management', permission: permissions['Production Planning']?.['M4 Management'] },
    { path: '/production/m3-management', permission: permissions['Production Planning']?.['M3 Management'] },
    { path: '/production/floor-supervisor/machine-floor', permission: permissions['Production Planning']?.['Machine Floor'] },
    { path: '/production/floor-supervisor/warehouse', permission: permissions['Production Planning']?.['Warehouse Floor'] },
    { path: '/yarn-management/cataloguing', permission: permissions['Yarn Management']?.['Cataloguing'] },
    { path: '/yarn-management/purchase', permission: permissions['Yarn Management']?.['Purchase'] },
    { path: '/yarn-management/inventory', permission: permissions['Yarn Management']?.['Inventory'] },
    { path: '/yarn-management/yarn-issue', permission: canAccessYarnIssueForOrders(permissions) },
    { path: '/yarn-management/yarn-master/brand', permission: permissions['Yarn Management']?.['Yarn Master']?.['Brand'] },
    { path: '/yarn-management/yarn-master/yarn-type', permission: permissions['Yarn Management']?.['Yarn Master']?.['Yarn Type'] },
    { path: '/yarn-management/yarn-master/count-size', permission: permissions['Yarn Management']?.['Yarn Master']?.['Count/Size'] },
    { path: '/yarn-management/yarn-master/color', permission: permissions['Yarn Management']?.['Yarn Master']?.['Color'] },
    { path: '/warehouse-management/orders', permission: permissions['Warehouse Management']?.['Orders'] },
    { path: '/warehouse-management/inward', permission: permissions['Warehouse Management']?.['Inward'] },
    { path: '/warehouse-management/clients', permission: permissions['Warehouse Management']?.['Clients'] },
    { path: '/warehouse-management/pick-pack', permission: permissions['Warehouse Management']?.['Pick&Pack'] },
    { path: '/warehouse-management/scanning', permission: permissions['Warehouse Management']?.['Scanning'] },
    { path: '/warehouse-management/billing', permission: permissions['Warehouse Management']?.['Billing'] },
    { path: '/warehouse-management/dispatch', permission: permissions['Warehouse Management']?.['Dispatch'] },
    { path: '/warehouse-management/returns', permission: permissions['Warehouse Management']?.['Returns'] },
    { path: '/warehouse-management/layout', permission: permissions['Warehouse Management']?.['Layout'] },
    { path: '/warehouse-management/stock', permission: permissions['Warehouse Management']?.['Stock'] },
    { path: '/warehouse-management/reports', permission: permissions['Warehouse Management']?.['Reports'] },
    { path: '/vendor-po/m2-management', permission: permissions['Vendor PO']?.['M2 Management'] },
    { path: '/vendor-po/m3-management', permission: permissions['Vendor PO']?.['M3 Management'] },
    { path: '/vendor-po/m4-management', permission: permissions['Vendor PO']?.['M4 Management'] },
    { path: '/vendor-po/secondary-checking', permission: permissions['Vendor PO']?.['Secondary Checking'] },
    { path: '/vendor-po/branding', permission: permissions['Vendor PO']?.['Branding'] },
    { path: '/vendor-po/re-boarding', permission: permissions['Vendor PO']?.['Re-Boarding'] },
    { path: '/vendor-po/final-checking', permission: permissions['Vendor PO']?.['Final Checking'] },
    { path: '/vendor-po/dispatch', permission: permissions['Vendor PO']?.['Dispatch'] },
  ];

  // Find the first route the user has permission for
  for (const route of routeChecks) {
    if (route.permission) {
      return route.path;
    }
  }

  // If no permissions, redirect to login
  return '/auth/login';
};
