import { useMemo } from 'react';
import { useNavigation } from '@/shared/contextapi/navigationContext';

interface MenuItem {
  menutitle?: string;
  icon?: React.ReactNode;
  title: string;
  type: 'link' | 'sub';
  active: boolean;
  selected: boolean;
  path?: string;
  children?: MenuItem[];
}

export const useNavigationMenu = (menuItems: MenuItem[]): MenuItem[] => {
  const { hasPermission, hasSubPermission, isLoading, permissions } = useNavigation();
  
  // Map display titles to permission keys for yarn master items
  const getPermissionKey = (displayTitle: string, path: string): string => {
    // For yarn master items, map display titles to permission keys
    if (path.startsWith('/yarn-management/yarn-master/')) {
      const titleMap: { [key: string]: string } = {
        'Brand/Supplier': 'Brand',
        'Brand': 'Brand', // Fallback for backward compatibility
      };
      return titleMap[displayTitle] || displayTitle;
    }
    // For purchase management items, map display titles to permission keys
    if (path.startsWith('/yarn-management/purchase-management/')) {
      const titleMap: { [key: string]: string } = {
        'PO Received': 'Purchase Order Recevied',
        'All POs': 'Purchase Order',
        'Purchase Order Recevied': 'Purchase Order Recevied',
      };
      return titleMap[displayTitle] || displayTitle;
    }
    return displayTitle;
  };

  /**
   * Maps sidebar URLs under Yarn Issue to nested permission keys (includes add/edit under orders).
   */
  const yarnIssuePathAllowed = (path: string): boolean => {
    const base = path.split('?')[0];
    if (
      base === '/yarn-management/yarn-issue' ||
      base.startsWith('/yarn-management/yarn-issue/edit') ||
      base.startsWith('/yarn-management/yarn-issue/add')
    ) {
      return hasSubPermission('/yarn-management/yarn-issue', 'Issue for orders');
    }
    if (
      base === '/yarn-management/yarn-issue/linking-sampling' ||
      base.startsWith('/yarn-management/yarn-issue/linking-sampling/')
    ) {
      return hasSubPermission('/yarn-management/yarn-issue', 'Linking & sampling');
    }
    return false;
  };

  const hasVendorPOPurchaseManagementPermission = (): boolean =>
    hasSubPermission('/vendor-po', 'Vendor List') ||
    hasSubPermission('/vendor-po', 'Vendor PO Raise') ||
    hasSubPermission('/vendor-po', 'Vendor PO Receive') ||
    hasSubPermission('/vendor-po', 'GRN') ||
    hasSubPermission('/vendor-po', 'Vendor PO Return') ||
    hasSubPermission('/vendor-po', 'Vendor PO Return Challan');

  const isVendorPOPurchaseManagementNestedPath = (path: string): boolean =>
    path.startsWith('/vendor-po/purchase-management/') ||
    path === '/vendor-po/vendor-list' ||
    path === '/vendor-po/grn' ||
    path === '/vendor-po/purchase-management/po-return';

  /** Maps WHMS sidebar labels to flat navigation permission keys. */
  const getWhmsPermissionKey = (path: string, displayTitle: string): string => {
    const pathKeyMap: Record<string, string> = {
      '/warehouse-management/orders': 'Orders',
      '/warehouse-management/clients': 'Clients',
      '/warehouse-management/pick-pack': 'Pick&Pack',
      '/warehouse-management/scanning': 'Scanning',
      '/warehouse-management/billing': 'Billing',
      '/warehouse-management/dispatch': 'Dispatch',
      '/warehouse-management/inward': 'Inward',
      '/warehouse-management/stock': 'Stock',
      '/warehouse-management/layout': 'Layout',
      '/warehouse-management/returns': 'Returns',
      '/warehouse-management/reports': 'Reports',
    };
    const base = path.split('?')[0];
    return pathKeyMap[base] || displayTitle;
  };

  /** Whether the user can access a WHMS leaf route. */
  const whmsPathAllowed = (path: string): boolean => {
    const base = path.split('?')[0];
    if (!base.startsWith('/warehouse-management/')) return false;
    const permissionKey = getWhmsPermissionKey(base, '');
    return hasSubPermission('/warehouse-management', permissionKey);
  };

  /** Whether a WHMS sidebar group should render (any child permitted). */
  const hasWhmsGroupPermission = (groupPath: string): boolean => {
    if (groupPath === '/warehouse-management/order-management') {
      return whmsPathAllowed('/warehouse-management/orders') || whmsPathAllowed('/warehouse-management/clients');
    }
    if (groupPath === '/warehouse-management/fulfilment-flow') {
      return (
        whmsPathAllowed('/warehouse-management/pick-pack') ||
        whmsPathAllowed('/warehouse-management/scanning') ||
        whmsPathAllowed('/warehouse-management/billing') ||
        whmsPathAllowed('/warehouse-management/dispatch')
      );
    }
    if (groupPath === '/warehouse-management/stock-inward') {
      return (
        whmsPathAllowed('/warehouse-management/inward') ||
        whmsPathAllowed('/warehouse-management/stock') ||
        whmsPathAllowed('/warehouse-management/layout')
      );
    }
    return false;
  };

  const hasVendorPOPurchaseManagementChildPermission = (path: string): boolean => {
    if (path === '/vendor-po/vendor-list') return hasSubPermission('/vendor-po', 'Vendor List');
    if (path === '/vendor-po/grn') return hasSubPermission('/vendor-po', 'GRN');
    if (path === '/vendor-po/purchase-management/po-return') {
      return (
        hasSubPermission('/vendor-po', 'Vendor PO Return') ||
        hasSubPermission('/vendor-po', 'Vendor PO Return Challan')
      );
    }
    if (path.startsWith('/vendor-po/purchase-management/purchase-order-received')) {
      return hasSubPermission('/vendor-po', 'Vendor PO Receive');
    }
    if (path.startsWith('/vendor-po/purchase-management/purchase')) {
      return hasSubPermission('/vendor-po', 'Vendor PO Raise');
    }
    return false;
  };
  
  // Debug: Log permissions
  if (permissions) {
    console.log('Navigation permissions:', permissions);
    console.log('Yarn Management permissions:', permissions['Yarn Management']);
    if (permissions['Yarn Management']) {
      console.log('Yarn Master permissions:', (permissions['Yarn Management'] as any)['Yarn Master']);
    }
  }

  const filteredMenuItems = useMemo(() => {
    if (isLoading) {
      return []; // Return empty array while loading to prevent flash
    }

    // If no permissions are available, show minimal items (only dashboard)
    if (!hasPermission || !hasSubPermission) {
      console.log('No permission functions available, showing minimal menu items');
      return menuItems.filter(item => 
        item.menutitle || 
        (item.type === 'link' && item.path === '/dashboard')
      );
    }

    return menuItems.filter(item => {
      // Always show menu titles
      if (item.menutitle) {
        return true;
      }

      // Check main menu items
      if (item.type === 'link' && item.path) {
        return hasPermission(item.path);
      }

      // Check sub-menu items
      if (item.type === 'sub' && item.children) {
        // First check if parent menu item has permission (if it has a path)
        if (item.path && !hasPermission(item.path)) {
          return false;
        }
        
        // Filter children based on permissions
        const filteredChildren = item.children.filter(child => {
          // Handle nested submenus (e.g., Yarn Master, Purchase Management within Yarn Management)
          if (child.type === 'sub' && child.children) {
            // First check if user has permission to see the Yarn Master submenu itself
            if (child.path === '/yarn-management/yarn-master') {
              const hasYarnMasterPermission = hasSubPermission('/yarn-management', 'Yarn Master');
              if (!hasYarnMasterPermission) {
                return false;
              }
            }
            // First check if user has permission to see the Purchase Management submenu itself
            if (child.path === '/yarn-management/purchase-management') {
              const hasPurchaseManagementPermission = hasSubPermission('/yarn-management', 'Purchase Management');
              if (!hasPurchaseManagementPermission) {
                return false;
              }
            }
            if (child.path === '/yarn-management/yarn-issue') {
              if (!hasSubPermission('/yarn-management', 'Yarn Issue')) {
                return false;
              }
            }
            if (child.path === '/vendor-po/purchase-management' && !hasVendorPOPurchaseManagementPermission()) {
              return false;
            }
            if (
              child.path === '/warehouse-management/order-management' ||
              child.path === '/warehouse-management/fulfilment-flow' ||
              child.path === '/warehouse-management/stock-inward'
            ) {
              if (!hasWhmsGroupPermission(child.path)) {
                return false;
              }
            }
            
            // Check if this is the Analytics & reports submenu
            if (child.path === '/yarn-management/dashboard') {
              const hasAnalytics = hasSubPermission('/yarn-management', 'Analytics & reports');
              const hasDashboard = hasSubPermission('/yarn-management', 'Dashboard');
              if (!hasAnalytics && !hasDashboard) return false;
            }

            // Check if nested submenu has any visible children
            const hasVisibleChildren = child.children.some(nestedChild => {
              if (nestedChild.type === 'link' && nestedChild.path) {
                const nestedPathBase = nestedChild.path.split('?')[0];
                if (isVendorPOPurchaseManagementNestedPath(nestedChild.path)) {
                  return hasVendorPOPurchaseManagementChildPermission(nestedChild.path);
                }
                if (
                  nestedChild.path === '/yarn-management/yarn-issue' ||
                  nestedChild.path.startsWith('/yarn-management/yarn-issue/')
                ) {
                  return yarnIssuePathAllowed(nestedChild.path);
                }
                if (nestedChild.path.startsWith('/yarn-management/yarn-master/')) {
                  const permissionKey = getPermissionKey(nestedChild.title, nestedChild.path);
                  return hasSubPermission('/yarn-management/yarn-master', permissionKey);
                }
                if (nestedChild.path === '/yarn-management/grn') {
                  return hasSubPermission('/yarn-management/purchase-management', 'GRN History');
                }
                if (nestedChild.path.startsWith('/yarn-management/purchase-management/')) {
                  const permissionKey = getPermissionKey(nestedChild.title, nestedChild.path);
                  return hasSubPermission('/yarn-management/purchase-management', permissionKey);
                }
                // Handle Analytics & reports children (Live Inventory, reports, analytics tabs)
                if (nestedPathBase === '/yarn-management/dashboard') {
                  return hasSubPermission('/yarn-management', 'Dashboard');
                }
                if (nestedPathBase.startsWith('/yarn-management/dashboard/')) {
                  return hasSubPermission('/yarn-management', 'Analytics & reports');
                }
                // Handle Purchase Order and Purchase Order Received which are direct links
                if (nestedChild.path === '/yarn-management/purchase') {
                  return hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');
                }
                if (nestedChild.path === '/yarn-management/purchase-order-received') {
                  return hasSubPermission('/yarn-management/purchase-management', 'Purchase Order Recevied');
                }
                if (nestedChild.path.startsWith('/warehouse-management/')) {
                  return whmsPathAllowed(nestedChild.path);
                }
              }
              return false;
            });

            // Only show nested submenu if it has visible children
            return hasVisibleChildren;
          }

          if (child.type === 'link' && child.path) {
            // Map paths to parent/child structure
            // Handle yarn-management items that are shown under catalog
            if (child.path.startsWith('/yarn-management/')) {
              const childName = child.title;
              // Handle Dashboard permission
              if (child.path === '/yarn-management/dashboard') {
                return hasSubPermission('/yarn-management', 'Dashboard');
              }
              if (child.path.startsWith('/yarn-management/dashboard/')) {
                return hasSubPermission('/yarn-management', 'Analytics & reports');
              }
              // Handle Cataloguing permission (shown under catalog but uses yarn-management permissions)
              if (child.path === '/yarn-management/cataloguing') {
                return hasSubPermission('/yarn-management', 'Cataloguing');
              }
              // Handle nested Yarn Master permissions
              if (child.path === '/yarn-management/yarn-master') {
                return hasSubPermission('/yarn-management', 'Yarn Master');
              }
              // If path starts with /yarn-management/yarn-master/, check nested permissions
              if (child.path.startsWith('/yarn-management/yarn-master/')) {
                const permissionKey = getPermissionKey(childName, child.path);
                return hasSubPermission('/yarn-management/yarn-master', permissionKey);
              }
              if (
                child.path === '/yarn-management/yarn-issue' ||
                child.path.startsWith('/yarn-management/yarn-issue/')
              ) {
                return yarnIssuePathAllowed(child.path);
              }
              // Handle Purchase Management
              if (child.path === '/yarn-management/purchase-management') {
                return hasSubPermission('/yarn-management', 'Purchase Management');
              }
              // If path starts with /yarn-management/purchase-management/, check nested permissions
              if (child.path.startsWith('/yarn-management/purchase-management/')) {
                const permissionKey = getPermissionKey(childName, child.path);
                return hasSubPermission('/yarn-management/purchase-management', permissionKey);
              }
              return hasSubPermission('/yarn-management', childName);
            }
            if (child.path.startsWith('/catalog/')) {
              const childName = child.title;
              return hasSubPermission('/catalog', childName);
            }
            if (child.path === '/sales' || child.path.startsWith('/sales/')) {
              const childName = child.title;
              return hasSubPermission('/sales', childName);
            }
            if (child.path.startsWith('/production/')) {
              const childName = child.title;
              return hasSubPermission('/production', childName);
            }
            if (child.path.startsWith('/warehouse-management/')) {
              return whmsPathAllowed(child.path);
            }
            if (child.path.startsWith('/vendor-po/')) {
              if (child.path === '/vendor-po/purchase-management') {
                return hasVendorPOPurchaseManagementPermission();
              }
              if (isVendorPOPurchaseManagementNestedPath(child.path)) {
                return hasVendorPOPurchaseManagementChildPermission(child.path);
              }
              const childName = child.title;
              return hasSubPermission('/vendor-po', childName);
            }
          }
          return false;
        });

        // Only show parent if it has visible children
        if (filteredChildren.length > 0) {
          // Process filtered children to handle nested submenus
          const processedChildren = filteredChildren.map(child => {
            // Handle nested submenus (e.g., Yarn Master, Purchase Management, Analytics & reports within Yarn Management)
            if (child.type === 'sub' && child.children) {
              // Filter nested children
              const nestedFilteredChildren = child.children.filter(nestedChild => {
                if (nestedChild.type === 'link' && nestedChild.path) {
                  const nestedPathBase = nestedChild.path.split('?')[0];
                  if (isVendorPOPurchaseManagementNestedPath(nestedChild.path)) {
                    return hasVendorPOPurchaseManagementChildPermission(nestedChild.path);
                  }
                  if (
                    nestedChild.path === '/yarn-management/yarn-issue' ||
                    nestedChild.path.startsWith('/yarn-management/yarn-issue/')
                  ) {
                    return yarnIssuePathAllowed(nestedChild.path);
                  }
                  if (nestedChild.path.startsWith('/yarn-management/yarn-master/')) {
                    const permissionKey = getPermissionKey(nestedChild.title, nestedChild.path);
                    return hasSubPermission('/yarn-management/yarn-master', permissionKey);
                  }
                  if (nestedChild.path === '/yarn-management/grn') {
                    return hasSubPermission('/yarn-management/purchase-management', 'GRN History');
                  }
                  if (nestedChild.path.startsWith('/yarn-management/purchase-management/')) {
                    const permissionKey = getPermissionKey(nestedChild.title, nestedChild.path);
                    return hasSubPermission('/yarn-management/purchase-management', permissionKey);
                  }
                  // Analytics & reports children
                  if (nestedPathBase === '/yarn-management/dashboard') {
                    return hasSubPermission('/yarn-management', 'Dashboard');
                  }
                  if (nestedPathBase.startsWith('/yarn-management/dashboard/')) {
                    return hasSubPermission('/yarn-management', 'Analytics & reports');
                  }
                  // Handle Purchase Order and Purchase Order Received which are direct links
                  if (nestedChild.path === '/yarn-management/purchase') {
                    return hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');
                  }
                  if (nestedChild.path === '/yarn-management/purchase-order-received') {
                    return hasSubPermission('/yarn-management/purchase-management', 'Purchase Order Recevied');
                  }
                  if (nestedChild.path.startsWith('/warehouse-management/')) {
                    return whmsPathAllowed(nestedChild.path);
                  }
                }
                return false;
              });
              
              return {
                ...child,
                children: nestedFilteredChildren
              };
            }
            return child;
          });
          
          return {
            ...item,
            children: processedChildren
          };
        }
        return false;
      }

      return false;
    }).map(item => {
      // For sub-menu items, return the filtered version
      if (item.type === 'sub' && item.children) {
        const filteredChildren = item.children.filter(child => {
          // Handle nested submenus (e.g., Yarn Master, Purchase Management, Analytics & reports within Yarn Management)
          if (child.type === 'sub' && child.children) {
            // First check if user has permission to see the Yarn Master submenu itself
            if (child.path === '/yarn-management/yarn-master') {
              const hasYarnMasterPermission = hasSubPermission('/yarn-management', 'Yarn Master');
              if (!hasYarnMasterPermission) {
                return false;
              }
            }
            // First check if user has permission to see the Purchase Management submenu itself
            if (child.path === '/yarn-management/purchase-management') {
              const hasPurchaseManagementPermission = hasSubPermission('/yarn-management', 'Purchase Management');
              if (!hasPurchaseManagementPermission) {
                return false;
              }
            }
            if (child.path === '/yarn-management/yarn-issue') {
              if (!hasSubPermission('/yarn-management', 'Yarn Issue')) {
                return false;
              }
            }
            // Check Analytics & reports submenu
            if (child.path === '/yarn-management/dashboard') {
              const hasAnalytics = hasSubPermission('/yarn-management', 'Analytics & reports');
              const hasDashboard = hasSubPermission('/yarn-management', 'Dashboard');
              if (!hasAnalytics && !hasDashboard) return false;
            }
            if (child.path === '/vendor-po/purchase-management' && !hasVendorPOPurchaseManagementPermission()) {
              return false;
            }
            if (
              child.path === '/warehouse-management/order-management' ||
              child.path === '/warehouse-management/fulfilment-flow' ||
              child.path === '/warehouse-management/stock-inward'
            ) {
              if (!hasWhmsGroupPermission(child.path)) {
                return false;
              }
            }

            // Check if nested submenu has any visible children
            const hasVisibleChildren = child.children.some(nestedChild => {
              if (nestedChild.type === 'link' && nestedChild.path) {
                const nestedPathBase = nestedChild.path.split('?')[0];
                if (isVendorPOPurchaseManagementNestedPath(nestedChild.path)) {
                  return hasVendorPOPurchaseManagementChildPermission(nestedChild.path);
                }
                if (
                  nestedChild.path === '/yarn-management/yarn-issue' ||
                  nestedChild.path.startsWith('/yarn-management/yarn-issue/')
                ) {
                  return yarnIssuePathAllowed(nestedChild.path);
                }
                if (nestedChild.path.startsWith('/yarn-management/yarn-master/')) {
                  const permissionKey = getPermissionKey(nestedChild.title, nestedChild.path);
                  return hasSubPermission('/yarn-management/yarn-master', permissionKey);
                }
                if (nestedChild.path === '/yarn-management/grn') {
                  return hasSubPermission('/yarn-management/purchase-management', 'GRN History');
                }
                if (nestedChild.path.startsWith('/yarn-management/purchase-management/')) {
                  const permissionKey = getPermissionKey(nestedChild.title, nestedChild.path);
                  return hasSubPermission('/yarn-management/purchase-management', permissionKey);
                }
                // Analytics & reports children
                if (nestedPathBase === '/yarn-management/dashboard') {
                  return hasSubPermission('/yarn-management', 'Dashboard');
                }
                if (nestedPathBase.startsWith('/yarn-management/dashboard/')) {
                  return hasSubPermission('/yarn-management', 'Analytics & reports');
                }
                // Handle Purchase Order and Purchase Order Received which are direct links
                if (nestedChild.path === '/yarn-management/purchase') {
                  return hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');
                }
                if (nestedChild.path === '/yarn-management/purchase-order-received') {
                  return hasSubPermission('/yarn-management/purchase-management', 'Purchase Order Recevied');
                }
                if (nestedChild.path.startsWith('/warehouse-management/')) {
                  return whmsPathAllowed(nestedChild.path);
                }
              }
              return false;
            });

            // Only show nested submenu if it has visible children
            return hasVisibleChildren;
          }
          
          if (child.type === 'link' && child.path) {
            // Handle yarn-management items that may be shown under catalog
            if (child.path.startsWith('/yarn-management/')) {
              const childName = child.title;
              // Handle Dashboard permission
              if (child.path === '/yarn-management/dashboard') {
                return hasSubPermission('/yarn-management', 'Dashboard');
              }
              if (child.path.startsWith('/yarn-management/dashboard/')) {
                return hasSubPermission('/yarn-management', 'Analytics & reports');
              }
              // Handle Cataloguing permission (shown under catalog but uses yarn-management permissions)
              if (child.path === '/yarn-management/cataloguing') {
                return hasSubPermission('/yarn-management', 'Cataloguing');
              }
              // Handle nested Yarn Master permissions
              // If path is exactly /yarn-management/yarn-master, check Yarn Master permission
              if (child.path === '/yarn-management/yarn-master') {
                return hasSubPermission('/yarn-management', 'Yarn Master');
              }
              // If path is exactly /yarn-management/purchase-management, check Purchase Management permission
              if (child.path === '/yarn-management/purchase-management') {
                return hasSubPermission('/yarn-management', 'Purchase Management');
              }
              // If path starts with /yarn-management/yarn-master/, check nested permissions
              if (child.path.startsWith('/yarn-management/yarn-master/')) {
                const permissionKey = getPermissionKey(childName, child.path);
                return hasSubPermission('/yarn-management/yarn-master', permissionKey);
              }
              if (
                child.path === '/yarn-management/yarn-issue' ||
                child.path.startsWith('/yarn-management/yarn-issue/')
              ) {
                return yarnIssuePathAllowed(child.path);
              }
              // If path starts with /yarn-management/purchase-management/, check nested permissions
              if (child.path.startsWith('/yarn-management/purchase-management/')) {
                const permissionKey = getPermissionKey(childName, child.path);
                return hasSubPermission('/yarn-management/purchase-management', permissionKey);
              }
              // Handle Purchase Order and Purchase Order Received which are direct links
              if (child.path === '/yarn-management/purchase') {
                return hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');
              }
              if (child.path === '/yarn-management/purchase-order-received') {
                return hasSubPermission('/yarn-management/purchase-management', 'Purchase Order Recevied');
              }
              return hasSubPermission('/yarn-management', childName);
            }
            if (child.path.startsWith('/catalog/')) {
              const childName = child.title;
              return hasSubPermission('/catalog', childName);
            }
            if (child.path === '/sales' || child.path.startsWith('/sales/')) {
              const childName = child.title;
              return hasSubPermission('/sales', childName);
            }
            if (child.path.startsWith('/production/')) {
              const childName = child.title;
              return hasSubPermission('/production', childName);
            }
            if (child.path.startsWith('/warehouse-management/')) {
              return whmsPathAllowed(child.path);
            }
            if (child.path.startsWith('/vendor-po/')) {
              if (child.path === '/vendor-po/purchase-management') {
                return hasVendorPOPurchaseManagementPermission();
              }
              if (isVendorPOPurchaseManagementNestedPath(child.path)) {
                return hasVendorPOPurchaseManagementChildPermission(child.path);
              }
              const childName = child.title;
              return hasSubPermission('/vendor-po', childName);
            }
          }
          return false;
        });

        // Process filtered children to handle nested submenus
        const processedChildren = filteredChildren.map(child => {
            // Handle nested submenus (e.g., Yarn Master, Purchase Management, Analytics & reports within Yarn Management)
            if (child.type === 'sub' && child.children) {
              // Filter nested children
              const nestedFilteredChildren = child.children.filter(nestedChild => {
                if (nestedChild.type === 'link' && nestedChild.path) {
                  const nestedPathBase = nestedChild.path.split('?')[0];
                  if (isVendorPOPurchaseManagementNestedPath(nestedChild.path)) {
                    return hasVendorPOPurchaseManagementChildPermission(nestedChild.path);
                  }
                  if (
                    nestedChild.path === '/yarn-management/yarn-issue' ||
                    nestedChild.path.startsWith('/yarn-management/yarn-issue/')
                  ) {
                    return yarnIssuePathAllowed(nestedChild.path);
                  }
                  if (nestedChild.path.startsWith('/yarn-management/yarn-master/')) {
                    const permissionKey = getPermissionKey(nestedChild.title, nestedChild.path);
                    return hasSubPermission('/yarn-management/yarn-master', permissionKey);
                  }
                  if (nestedChild.path === '/yarn-management/grn') {
                    return hasSubPermission('/yarn-management/purchase-management', 'GRN History');
                  }
                  if (nestedChild.path.startsWith('/yarn-management/purchase-management/')) {
                    const permissionKey = getPermissionKey(nestedChild.title, nestedChild.path);
                    return hasSubPermission('/yarn-management/purchase-management', permissionKey);
                  }
                  // Analytics & reports children
                  if (nestedPathBase === '/yarn-management/dashboard') {
                    return hasSubPermission('/yarn-management', 'Dashboard');
                  }
                  if (nestedPathBase.startsWith('/yarn-management/dashboard/')) {
                    return hasSubPermission('/yarn-management', 'Analytics & reports');
                  }
                  // Handle Purchase Order and Purchase Order Received which are direct links
                  if (nestedChild.path === '/yarn-management/purchase') {
                    return hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');
                  }
                  if (nestedChild.path === '/yarn-management/purchase-order-received') {
                    return hasSubPermission('/yarn-management/purchase-management', 'Purchase Order Recevied');
                  }
                  if (nestedChild.path.startsWith('/warehouse-management/')) {
                    return whmsPathAllowed(nestedChild.path);
                  }
                }
                return false;
              });
            
            return {
              ...child,
              children: nestedFilteredChildren
            };
          }
          return child;
        });

        return {
          ...item,
          children: processedChildren
        };
      }

      return item;
    });
  }, [menuItems, hasPermission, hasSubPermission, isLoading]);

  return filteredMenuItems;
};
