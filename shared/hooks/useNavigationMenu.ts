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
  const { hasPermission, hasSubPermission, isLoading } = useNavigation();

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
          }
          return false;
        });

        // Only show parent if it has visible children
        if (filteredChildren.length > 0) {
          return {
            ...item,
            children: filteredChildren
          };
        }
        return false;
      }

      return false;
    }).map(item => {
      // For sub-menu items, return the filtered version
      if (item.type === 'sub' && item.children) {
        const filteredChildren = item.children.filter(child => {
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
          }
          return false;
        });

        return {
          ...item,
          children: filteredChildren
        };
      }

      return item;
    });
  }, [menuItems, hasPermission, hasSubPermission, isLoading]);

  return filteredMenuItems;
};
