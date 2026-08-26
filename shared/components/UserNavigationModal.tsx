import React, { useState, useEffect } from 'react';
import { User, UpdateNavigationRequest } from '@/shared/services/userService';
import {
  mergeYarnIssuePermissions,
  mergeNavigationWithDefaults,
  EMPTY_YARN_ISSUE_NAV_DEFAULTS,
} from '@/shared/contextapi/navigationContext';

interface UserNavigationModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, navigation: UpdateNavigationRequest) => Promise<void>;
  loading?: boolean;
}

const UserNavigationModal: React.FC<UserNavigationModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  loading = false
}) => {
  const [navigation, setNavigation] = useState<Partial<User['navigation']>>({});

  useEffect(() => {
    if (user && isOpen) {
      console.log('Setting navigation for user:', user.id, user.name);
      console.log('User navigation data:', user.navigation);
      const rawNav = user.navigation as Partial<User['navigation']>;
      setNavigation(mergeNavigationWithDefaults(rawNav));
    }
  }, [user, isOpen]);

  /**
   * Updates flat sections (catalog, dashboard) or nested Yarn Issue submenu keys when `fourth` is supplied.
   */
  const handleNavigationChange = (
    section: string,
    subsection: string | null,
    third: boolean | string,
    fourth?: boolean
  ) => {
    setNavigation(prev => {
      const newNav = { ...(prev as Record<string, unknown>) } as Record<string, unknown>;

      if (
        fourth !== undefined &&
        typeof third === 'string' &&
        subsection !== null &&
        section === 'Yarn Management' &&
        subsection === 'Yarn Issue'
      ) {
        if (!newNav['Yarn Management']) newNav['Yarn Management'] = {};
        const ym = newNav['Yarn Management'] as Record<string, unknown>;
        const prevYi = ym['Yarn Issue'];
        const base = mergeYarnIssuePermissions(
          prevYi as Parameters<typeof mergeYarnIssuePermissions>[0],
          EMPTY_YARN_ISSUE_NAV_DEFAULTS
        );
        ym['Yarn Issue'] = { ...base, [third]: fourth };
        return newNav as Partial<User['navigation']>;
      }

      const value = third as boolean;
      if (subsection) {
        if (!newNav[section] || typeof newNav[section] !== 'object') {
          newNav[section] = {};
        }
        (newNav[section] as Record<string, unknown>)[subsection] = value;
      } else {
        newNav[section] = value;
      }

      return newNav as Partial<User['navigation']>;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      await onSave(user.id, { navigation: mergeNavigationWithDefaults(navigation) });
      onClose();
    } catch (error) {
      console.error('Failed to save navigation:', error);
    }
  };

  const handleSelectAll = (section: string, subsections: string[]) => {
    const allSelected = subsections.every(sub => 
      (navigation[section as keyof typeof navigation] as any)?.[sub] === true
    );
    
    subsections.forEach(sub => {
      handleNavigationChange(section, sub, !allSelected);
    });
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-bodybg rounded-lg shadow-lg p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-3 right-3 ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
          onClick={onClose}
        >
          <i className="ri-close-line"></i>
        </button>
        
        <h2 className="text-lg font-semibold mb-4 text-defaulttextcolor">
          Navigation Permissions - {user.name}
        </h2>
        
        <div className="space-y-6">
          {/* Main Sections */}
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Main Sections</h3>
            <div className="space-y-2">
              {[
                { key: 'Users', label: 'Users Management' },
                { key: 'Stores', label: 'Stores' },
                { key: 'Analytics', label: 'Analytics' },
                { key: 'Replenishment Agent', label: 'Replenishment Agent' },
                { key: 'File Manager', label: 'File Manager' },
                { key: 'Help & Support', label: 'Help & Support' }
              ].map(section => (
                <label key={section.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(navigation as any)[section.key] === true}
                    onChange={(e) => handleNavigationChange(section.key, null, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{section.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dashboard Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">Dashboard</h3>
              <button
                type="button"
                className="text-xs text-primary hover:text-primary-dark"
                onClick={() =>
                  handleSelectAll('Dashboard', [
                    'Catalog Dashboard',
                    'Production Dashboard',
                    'Vendor Dashboard',
                    'Yarn Dashboard',
                  ])
                }
              >
                Toggle All
              </button>
            </div>
            <div className="space-y-2 ml-4">
              {[
                { key: 'Catalog Dashboard', label: 'Catalog Dashboard' },
                { key: 'Production Dashboard', label: 'Production Dashboard' },
                { key: 'Vendor Dashboard', label: 'Vendor Dashboard' },
                { key: 'Yarn Dashboard', label: 'Yarn Dashboard' },
              ].map((subsection) => (
                <label key={subsection.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(navigation.Dashboard as Record<string, boolean> | undefined)?.[subsection.key] === true}
                    onChange={(e) => handleNavigationChange('Dashboard', subsection.key, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{subsection.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reports Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">Reports</h3>
              <button
                type="button"
                className="text-xs text-primary hover:text-primary-dark"
                onClick={() =>
                  handleSelectAll('Reports', [
                    'Invoice Report',
                    'Production order summary',
                    'Core Report',
                    'Backlog report',
                    'Daily production summary',
                    'Advanced Planning',
                    'Needle Wise Planning',
                  ])
                }
              >
                Toggle All
              </button>
            </div>
            <div className="space-y-2 ml-4">
              {[
                { key: 'Invoice Report', label: 'Invoice Report' },
                { key: 'Production order summary', label: 'Production order summary' },
                { key: 'Core Report', label: 'Core Report' },
                { key: 'Backlog report', label: 'Backlog report' },
                { key: 'Daily production summary', label: 'Daily production summary' },
                { key: 'Advanced Planning', label: 'Advanced Planning' },
                { key: 'Needle Wise Planning', label: 'Needle Wise Planning' },
              ].map((subsection) => (
                <label key={subsection.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(navigation.Reports as Record<string, boolean> | undefined)?.[subsection.key] === true}
                    onChange={(e) => handleNavigationChange('Reports', subsection.key, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{subsection.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Catalog Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">Catalog</h3>
              <button
                type="button"
                className="text-xs text-primary hover:text-primary-dark"
                onClick={() => handleSelectAll('Catalog', ['Items', 'Categories', 'Raw Material', 'Processes', 'Attributes', 'Style Codes', 'Style Code Pairs', 'Machines', 'Needle Configuration', 'Team Master', 'Containers Master'])}
              >
                Toggle All
              </button>
            </div>
            <div className="space-y-2 ml-4">
              {[
                { key: 'Items', label: 'Items' },
                { key: 'Categories', label: 'Categories' },
                { key: 'Raw Material', label: 'Raw Material' },
                { key: 'Processes', label: 'Processes' },
                { key: 'Attributes', label: 'Attributes' },
                { key: 'Style Codes', label: 'Style Codes' },
                { key: 'Style Code Pairs', label: 'Style Code Pairs' },
                { key: 'Machines', label: 'Machines' },
                { key: 'Needle Configuration', label: 'Needle Configuration' },
                { key: 'Team Master', label: 'Team Master' },
                { key: 'Containers Master', label: 'Containers Master' }
              ].map(subsection => (
                <label key={subsection.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(navigation.Catalog as any)?.[subsection.key] === true}
                    onChange={(e) => handleNavigationChange('Catalog', subsection.key, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{subsection.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sales Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">Sales</h3>
              <button
                type="button"
                className="text-xs text-primary hover:text-primary-dark"
                onClick={() => handleSelectAll('Sales', ['All Sales', 'Master Sales'])}
              >
                Toggle All
              </button>
            </div>
            <div className="space-y-2 ml-4">
              {[
                { key: 'All Sales', label: 'All Sales' },
                { key: 'Master Sales', label: 'Master Sales' }
              ].map(subsection => (
                <label key={subsection.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(navigation.Sales as any)?.[subsection.key] === true}
                    onChange={(e) => handleNavigationChange('Sales', subsection.key, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{subsection.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Production Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">Production</h3>
              <button
                type="button"
                className="text-xs text-primary hover:text-primary-dark"
                onClick={() => handleSelectAll('Production', [
                  'Production Supervisor', 'Knitting Floor Supervisor', 'Linking Floor Supervisor',
                  'Checking Floor Supervisor', 'Washing Floor Supervisor', 'Boarding Floor Supervisor',
                  'Final Checking Floor Supervisor', 'Branding Floor Supervisor', 'Warehouse Floor Supervisor'
                ])}
              >
                Toggle All
              </button>
            </div>
            <div className="space-y-2 ml-4">
              {[
                { key: 'Production Supervisor', label: 'Production Supervisor' },
                { key: 'Knitting Floor Supervisor', label: 'Knitting Floor Supervisor' },
                { key: 'Linking Floor Supervisor', label: 'Linking Floor Supervisor' },
                { key: 'Checking Floor Supervisor', label: 'Checking Floor Supervisor' },
                { key: 'Washing Floor Supervisor', label: 'Washing Floor Supervisor' },
                { key: 'Boarding Floor Supervisor', label: 'Boarding Floor Supervisor' },
                { key: 'Final Checking Floor Supervisor', label: 'Final Checking Floor Supervisor' },
                { key: 'Branding Floor Supervisor', label: 'Branding Floor Supervisor' },
                { key: 'Warehouse Floor Supervisor', label: 'Warehouse Floor Supervisor' }
              ].map(subsection => (
                <label key={subsection.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(navigation.Production as any)?.[subsection.key] === true}
                    onChange={(e) => handleNavigationChange('Production', subsection.key, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{subsection.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Yarn Management Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">Yarn Management</h3>
              <button
                type="button"
                className="text-xs text-primary hover:text-primary-dark"
                onClick={() =>
                  handleSelectAll('Yarn Management', [
                    'Dashboard',
                    'Analytics & reports',
                    'Cataloguing',
                    'Inventory',
                    'Yarn Return',
                  ])
                }
              >
                Toggle All
              </button>
            </div>
            <div className="space-y-2 ml-4">
              {[
                { key: 'Dashboard', label: 'Dashboard' },
                { key: 'Analytics & reports', label: 'Analytics & reports' },
                { key: 'Cataloguing', label: 'Cataloguing' },
                { key: 'Inventory', label: 'Inventory' },
                { key: 'Yarn Return', label: 'Yarn Return' },
              ].map((subsection) => (
                <label key={subsection.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(navigation['Yarn Management'] as any)?.[subsection.key] === true}
                    onChange={(e) => handleNavigationChange('Yarn Management', subsection.key, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{subsection.label}</span>
                </label>
              ))}
            </div>
            <div className="space-y-2 ml-6 mt-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Yarn Issue</p>
              {[
                { key: 'Issue for orders', label: 'Issue for orders' },
                { key: 'Linking & sampling', label: 'Linking & sampling' },
              ].map((row) => {
                const yi = (navigation['Yarn Management'] as any)?.['Yarn Issue'];
                const checked =
                  typeof yi === 'boolean' ? yi === true : yi?.[row.key] === true;
                return (
                  <label key={row.key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        handleNavigationChange('Yarn Management', 'Yarn Issue', row.key, e.target.checked)
                      }
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{row.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Warehouse Management Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">Warehouse Management</h3>
              <button
                type="button"
                className="text-xs text-primary hover:text-primary-dark"
                onClick={() =>
                  handleSelectAll('Warehouse Management', [
                    'Orders',
                    'Clients',
                    'Pick&Pack',
                    'Scanning',
                    'Billing',
                    'Dispatch',
                    'Inward',
                    'Stock',
                    'Layout',
                    'Returns',
                    'Reports',
                  ])
                }
              >
                Toggle All
              </button>
            </div>
            <div className="space-y-4 ml-4">
              {[
                { group: 'Order Management', items: [
                  { key: 'Orders', label: 'Orders' },
                  { key: 'Clients', label: 'Clients' },
                ]},
                { group: 'Fulfilment Flow', items: [
                  { key: 'Pick&Pack', label: 'Pick & Pack' },
                  { key: 'Scanning', label: 'Scanning' },
                  { key: 'Billing', label: 'Billing' },
                  { key: 'Dispatch', label: 'Dispatch' },
                ]},
                { group: 'Stock & Inward', items: [
                  { key: 'Inward', label: 'Inward' },
                  { key: 'Stock', label: 'Stock' },
                  { key: 'Layout', label: 'Warehouse Layout' },
                ]},
                { group: 'Returns & Reports', items: [
                  { key: 'Returns', label: 'Returns' },
                  { key: 'Reports', label: 'Reports' },
                ]},
              ].map((section) => (
                <div key={section.group}>
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">{section.group}</h4>
                  <div className="space-y-2 ml-4">
                    {section.items.map((subsection) => (
                      <label key={subsection.key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(navigation['Warehouse Management'] as any)?.[subsection.key] === true}
                          onChange={(e) =>
                            handleNavigationChange('Warehouse Management', subsection.key, e.target.checked)
                          }
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{subsection.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button 
            className="ti-btn ti-btn-light" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="ti-btn ti-btn-primary" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Navigation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNavigationModal;
