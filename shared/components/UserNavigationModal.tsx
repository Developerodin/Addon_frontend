import React, { useState, useEffect } from 'react';
import { User, UpdateNavigationRequest } from '@/shared/services/userService';

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
      setNavigation(user.navigation);
    }
  }, [user, isOpen]);

  const handleNavigationChange = (section: string, subsection: string | null, value: boolean) => {
    setNavigation(prev => {
      const newNav = { ...prev };
      
      if (subsection) {
        // Handle nested sections like Catalog.Items
        if (!newNav[section as keyof typeof newNav]) {
          newNav[section as keyof typeof newNav] = {} as any;
        }
        (newNav[section as keyof typeof newNav] as any)[subsection] = value;
      } else {
        // Handle top-level sections
        (newNav as any)[section] = value;
      }
      
      return newNav;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      await onSave(user.id, { navigation });
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
                { key: 'Dashboard', label: 'Dashboard' },
                { key: 'Stores', label: 'Stores' },
                { key: 'Analytics', label: 'Analytics' },
                { key: 'Replenishment Agent', label: 'Replenishment Agent' },
                { key: 'File Manager', label: 'File Manager' }
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

          {/* Catalog Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">Catalog</h3>
              <button
                type="button"
                className="text-xs text-primary hover:text-primary-dark"
                onClick={() => handleSelectAll('Catalog', ['Items', 'Categories', 'Raw Material', 'Processes', 'Attributes'])}
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
                { key: 'Attributes', label: 'Attributes' }
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
                onClick={() => handleSelectAll('Yarn Management', ['Cataloguing', 'Purchase', 'Inventory', 'Yarn Issue'])}
              >
                Toggle All
              </button>
            </div>
            <div className="space-y-2 ml-4">
              {[
                { key: 'Cataloguing', label: 'Cataloguing' },
                { key: 'Purchase', label: 'Purchase' },
                { key: 'Inventory', label: 'Inventory' },
                { key: 'Yarn Issue', label: 'Yarn Issue' }
              ].map(subsection => (
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
          </div>

          {/* Warehouse Management Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">Warehouse Management</h3>
              <button
                type="button"
                className="text-xs text-primary hover:text-primary-dark"
                onClick={() => handleSelectAll('Warehouse Management', ['Orders', 'Pick&Pack', 'Layout', 'Stock', 'Reports'])}
              >
                Toggle All
              </button>
            </div>
            <div className="space-y-2 ml-4">
              {[
                { key: 'Orders', label: 'Orders' },
                { key: 'Pick&Pack', label: 'Pick&Pack' },
                { key: 'Layout', label: 'Layout' },
                { key: 'Stock', label: 'Stock' },
                { key: 'Reports', label: 'Reports' }
              ].map(subsection => (
                <label key={subsection.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(navigation['Warehouse Management'] as any)?.[subsection.key] === true}
                    onChange={(e) => handleNavigationChange('Warehouse Management', subsection.key, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{subsection.label}</span>
                </label>
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
