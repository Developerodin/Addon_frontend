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
    return displayTitle;
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
        // Filter children based on permissions
        const filteredChildren = item.children.filter(child => {
          // Handle nested submenus (e.g., Yarn Master within Yarn Management)
          if (child.type === 'sub' && child.children) {
            // First check if user has permission to see the Yarn Master submenu itself
            if (child.path === '/yarn-management/yarn-master') {
              const hasYarnMasterPermission = hasSubPermission('/yarn-management', 'Yarn Master');
              if (!hasYarnMasterPermission) {
                return false;
              }
            }
            
            // Check if nested submenu has any visible children
            const hasVisibleChildren = child.children.some(nestedChild => {
              if (nestedChild.type === 'link' && nestedChild.path) {
                if (nestedChild.path.startsWith('/yarn-management/yarn-master/')) {
                  const permissionKey = getPermissionKey(nestedChild.title, nestedChild.path);
                  return hasSubPermission('/yarn-management/yarn-master', permissionKey);
                }
              }
              return false;
            });
            
            // Only show nested submenu if it has visible children
            return hasVisibleChildren;
          }
          
          if (child.type === 'link' && child.path) {
            // Map paths to parent/child structure
            if (child.path.startsWith('/catalog/')) {
              const childName = child.title;
              return hasSubPermission('/catalog', childName);
            }
            if (child.path.startsWith('/sales/')) {
              const childName = child.title;
              return hasSubPermission('/sales', childName);
            }
            if (child.path.startsWith('/production/')) {
              const childName = child.title;
              return hasSubPermission('/production', childName);
            }
            if (child.path.startsWith('/yarn-management/')) {
              const childName = child.title;
              // Handle nested Yarn Master permissions
              // If path is exactly /yarn-management/yarn-master, check Yarn Master permission
              if (child.path === '/yarn-management/yarn-master') {
                return hasSubPermission('/yarn-management', 'Yarn Master');
              }
              // If path starts with /yarn-management/yarn-master/, check nested permissions
              if (child.path.startsWith('/yarn-management/yarn-master/')) {
                const permissionKey = getPermissionKey(childName, child.path);
                return hasSubPermission('/yarn-management/yarn-master', permissionKey);
              }
              return hasSubPermission('/yarn-management', childName);
            }
            if (child.path.startsWith('/warehouse-management/')) {
              const childName = child.title;
              return hasSubPermission('/warehouse-management', childName);
            }
          }
          return false;
        });

        // Only show parent if it has visible children
        if (filteredChildren.length > 0) {
          // Process filtered children to handle nested submenus
          const processedChildren = filteredChildren.map(child => {
            // Handle nested submenus (e.g., Yarn Master within Yarn Management)
            if (child.type === 'sub' && child.children) {
              // Filter nested children
              const nestedFilteredChildren = child.children.filter(nestedChild => {
                if (nestedChild.type === 'link' && nestedChild.path) {
                  if (nestedChild.path.startsWith('/yarn-management/yarn-master/')) {
                    const permissionKey = getPermissionKey(nestedChild.title, nestedChild.path);
                    return hasSubPermission('/yarn-management/yarn-master', permissionKey);
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
          // Handle nested submenus (e.g., Yarn Master within Yarn Management)
          if (child.type === 'sub' && child.children) {
            // First check if user has permission to see the Yarn Master submenu itself
            if (child.path === '/yarn-management/yarn-master') {
              const hasYarnMasterPermission = hasSubPermission('/yarn-management', 'Yarn Master');
              if (!hasYarnMasterPermission) {
                return false;
              }
            }
            
            // Check if nested submenu has any visible children
            const hasVisibleChildren = child.children.some(nestedChild => {
              if (nestedChild.type === 'link' && nestedChild.path) {
                if (nestedChild.path.startsWith('/yarn-management/yarn-master/')) {
                  const permissionKey = getPermissionKey(nestedChild.title, nestedChild.path);
                  return hasSubPermission('/yarn-management/yarn-master', permissionKey);
                }
              }
              return false;
            });
            
            // Only show nested submenu if it has visible children
            return hasVisibleChildren;
          }
          
          if (child.type === 'link' && child.path) {
            if (child.path.startsWith('/catalog/')) {
              const childName = child.title;
              return hasSubPermission('/catalog', childName);
            }
            if (child.path.startsWith('/sales/')) {
              const childName = child.title;
              return hasSubPermission('/sales', childName);
            }
            if (child.path.startsWith('/production/')) {
              const childName = child.title;
              return hasSubPermission('/production', childName);
            }
            if (child.path.startsWith('/yarn-management/')) {
              const childName = child.title;
              // Handle nested Yarn Master permissions
              // If path is exactly /yarn-management/yarn-master, check Yarn Master permission
              if (child.path === '/yarn-management/yarn-master') {
                return hasSubPermission('/yarn-management', 'Yarn Master');
              }
              // If path starts with /yarn-management/yarn-master/, check nested permissions
              if (child.path.startsWith('/yarn-management/yarn-master/')) {
                const permissionKey = getPermissionKey(childName, child.path);
                return hasSubPermission('/yarn-management/yarn-master', permissionKey);
              }
              return hasSubPermission('/yarn-management', childName);
            }
            if (child.path.startsWith('/warehouse-management/')) {
              const childName = child.title;
              return hasSubPermission('/warehouse-management', childName);
            }
          }
          return false;
        });

        // Process filtered children to handle nested submenus
        const processedChildren = filteredChildren.map(child => {
          // Handle nested submenus (e.g., Yarn Master within Yarn Management)
          if (child.type === 'sub' && child.children) {
            // Filter nested children
            const nestedFilteredChildren = child.children.filter(nestedChild => {
              if (nestedChild.type === 'link' && nestedChild.path) {
                if (nestedChild.path.startsWith('/yarn-management/yarn-master/')) {
                  const permissionKey = getPermissionKey(nestedChild.title, nestedChild.path);
                  return hasSubPermission('/yarn-management/yarn-master', permissionKey);
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
