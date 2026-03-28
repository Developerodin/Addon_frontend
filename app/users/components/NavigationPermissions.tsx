"use client"
import React from 'react'
import { User } from '@/shared/services/userService'

type NavigationState = Partial<User['navigation']>

interface NavigationPermissionsProps {
  navigation: NavigationState
  onChange: (section: string, subsection: string | null, subsubsection: string | null, value: boolean) => void
}

const NavigationPermissions: React.FC<NavigationPermissionsProps> = ({ navigation, onChange }) => {
  const mainSections = [
    { key: 'Dashboard', label: 'Dashboard' },
    { key: 'Stores', label: 'Stores' },
    { key: 'Analytics', label: 'Analytics' },
    { key: 'Replenishment Agent', label: 'Replenishment Agent' },
    { key: 'File Manager', label: 'File Manager' },
    { key: 'Users', label: 'Users Management' }
  ]

  const catalogSections = [
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
  ]

  const salesSections = [
    { key: 'All Sales', label: 'All Sales' },
    { key: 'Master Sales', label: 'Master Sales' }
  ]

  const productionPlanningSections = [
    { key: 'Production Orders', label: 'Production Orders' },
    { key: 'Knitting Floor', label: 'Knitting Floor' },
    { key: 'Linking Floor', label: 'Linking Floor' },
    { key: 'Checking Floor', label: 'Checking Floor' },
    { key: 'Washing Floor', label: 'Washing Floor' },
    { key: 'Boarding Floor', label: 'Boarding Floor' },
    { key: 'Silicon Floor', label: 'Silicon Floor' },
    { key: 'Secondary Checking Floor', label: 'Secondary Checking Floor' },
    { key: 'Branding Floor', label: 'Branding Floor' },
    { key: 'Final Checking Floor', label: 'Final Checking Floor' },
    { key: 'Dispatch Floor', label: 'Dispatch Floor' },
    { key: 'Machine Floor', label: 'Machine Floor' },
    { key: 'Warehouse Floor', label: 'Warehouse Floor' }
  ]

  const yarnManagementSections = [
    { key: 'Dashboard', label: 'Dashboard' },
    { key: 'Inventory', label: 'Inventory' },
    { key: 'Cataloguing', label: 'Cataloguing' },
    { key: 'Yarn Issue', label: 'Yarn Issue' },
    { key: 'Yarn Return', label: 'Yarn Return' }
  ]

  const purchaseManagementSections = [
    { key: 'Requisition list', label: 'Requisition list' },
    { key: 'Purchase Order', label: 'Purchase Order' },
    { key: 'Purchase Order Recevied', label: 'Purchase Order Recevied' },
    { key: 'Yarn QC', label: 'Yarn QC' },
    { key: 'Yarn Storage', label: 'Yarn Storage' }
  ]

  const yarnMasterSections = [
    { key: 'Brand', label: 'Brand' },
    { key: 'Yarn Type', label: 'Yarn Type' },
    { key: 'Count/Size', label: 'Count/Size' },
    { key: 'Color', label: 'Color' },
    { key: 'Blend', label: 'Blend' }
  ]

  const warehouseSections = [
    { key: 'Orders', label: 'Orders' },
    { key: 'Inward', label: 'Inward' },
    { key: 'Pick&Pack', label: 'Pick&Pack' },
    { key: 'Layout', label: 'Layout' },
    { key: 'Stock', label: 'Stock' },
    { key: 'Reports', label: 'Reports' }
  ]

  const vendorPOSections = [
    { key: 'Vendor List', label: 'Vendor List' },
    { key: 'Vendor PO Raise', label: 'Vendor PO Raise' },
    { key: 'Vendor PO Receive', label: 'Vendor PO Receive' },
    { key: 'Secondary Checking', label: 'Secondary Checking' },
    { key: 'Washing', label: 'Washing' },
    { key: 'Boarding', label: 'Boarding' },
    { key: 'Branding', label: 'Branding' },
    { key: 'Final Checking', label: 'Final Checking' },
    { key: 'Dispatch', label: 'Dispatch' },
    { key: 'Counting & Dispatch', label: 'Counting & Dispatch' },
    { key: 'GRN', label: 'GRN' }
  ]

  return (
    <div className="pt-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Navigation Permissions</h3>

      <div className="space-y-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Main Sections</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mainSections.map((section) => (
              <label key={section.key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(navigation as any)[section.key] === true}
                  onChange={(e) => onChange(section.key, null, null, e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">{section.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Master Catalog</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
            {catalogSections.map((subsection) => (
              <label key={subsection.key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(navigation.Catalog as any)?.[subsection.key] === true}
                  onChange={(e) => onChange('Catalog', subsection.key, null, e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">{subsection.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Sales</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
            {salesSections.map((subsection) => (
              <label key={subsection.key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(navigation.Sales as any)?.[subsection.key] === true}
                  onChange={(e) => onChange('Sales', subsection.key, null, e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">{subsection.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Production Planning</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
            {productionPlanningSections.map((subsection) => (
              <label key={subsection.key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(navigation['Production Planning'] as any)?.[subsection.key] === true}
                  onChange={(e) => onChange('Production Planning', subsection.key, null, e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">{subsection.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Yarn Management</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
            {yarnManagementSections.map((subsection) => (
              <label key={subsection.key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(navigation['Yarn Management'] as any)?.[subsection.key] === true}
                  onChange={(e) => onChange('Yarn Management', subsection.key, null, e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">{subsection.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 ml-8">
            <h5 className="text-sm font-medium text-gray-800 mb-2">Purchase Management</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
              {purchaseManagementSections.map((subsubsection) => (
                <label key={subsubsection.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(navigation['Yarn Management'] as any)?.['Purchase Management']?.[subsubsection.key] === true}
                    onChange={(e) => onChange('Yarn Management', 'Purchase Management', subsubsection.key, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">{subsubsection.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 ml-8">
            <h5 className="text-sm font-medium text-gray-800 mb-2">Yarn Master</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
              {yarnMasterSections.map((subsubsection) => (
                <label key={subsubsection.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(navigation['Yarn Management'] as any)?.['Yarn Master']?.[subsubsection.key] === true}
                    onChange={(e) => onChange('Yarn Management', 'Yarn Master', subsubsection.key, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">{subsubsection.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Warehouse Management</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
            {warehouseSections.map((subsection) => (
              <label key={subsection.key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(navigation['Warehouse Management'] as any)?.[subsection.key] === true}
                  onChange={(e) => onChange('Warehouse Management', subsection.key, null, e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">{subsection.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Vendor PO</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
            {vendorPOSections.map((subsection) => (
              <label key={subsection.key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(navigation['Vendor PO'] as any)?.[subsection.key] === true}
                  onChange={(e) => onChange('Vendor PO', subsection.key, null, e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">{subsection.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NavigationPermissions
