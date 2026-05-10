import React from "react";
import { useNavigationMenu } from "@/shared/hooks/useNavigationMenu";

const DashboardIcon = <i className="bx bx-home side-menu__icon"></i>;
const CatalogIcon = <i className="bx bx-package side-menu__icon"></i>;
const ItemsIcon = <i className="bx bx-box side-menu__icon"></i>;
const CategoriesIcon = <i className="bx bx-category side-menu__icon"></i>;
const MaterialIcon = <i className="bx bx-layer side-menu__icon"></i>;
const ProcessIcon = <i className="bx bx-cog side-menu__icon"></i>;
const AttributeIcon = <i className="bx bx-list-ul side-menu__icon"></i>;
const StyleCodeIcon = <i className="bx bx-purchase-tag side-menu__icon"></i>;
const MachinesIcon = <i className="bx bx-cog side-menu__icon"></i>;
const TeamMasterIcon = <i className="bx bx-group side-menu__icon"></i>;
const ContainersMasterIcon = <i className="ri ri-archive-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const SalesIcon = <i className="bx bx-cart side-menu__icon"></i>;
const StoresIcon = <i className="bx bx-store side-menu__icon"></i>;
const AnalyticsIcon = <i className="bx bx-bar-chart side-menu__icon"></i>;
const ReplenishmentIcon = <i className="bx bx-refresh side-menu__icon"></i>;
const FilemanagerIcon = <i className="ri ri-file-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const UsersIcon = <i className="ri ri-user-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const SupervisorIcon = <i className="bx bx-user-check side-menu__icon"></i>;
const ProductionIcon = <i className="bx bx-cog side-menu__icon"></i>;
const FloorIcon = <i className="bx bx-building side-menu__icon"></i>;
const YarnIcon = <i className="ri ri-threads-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const YarnDashboardIcon = <i className="ri ri-dashboard-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const CataloguingIcon = <i className="ri ri-book-open-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const PurchaseIcon = <i className="ri ri-shopping-cart-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const PurchaseReceivedIcon = <i className="ri ri-inbox-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const InventoryIcon = <i className="ri ri-archive-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const IssueIcon = <i className="ri ri-send-plane-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const ReturnIcon = <i className="ri ri-arrow-go-back-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const BrandIcon = <i className="ri ri-price-tag-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const YarnTypeIcon = <i className="ri ri-pantone-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const CountSizeIcon = <i className="ri ri-ruler-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const ColorIcon = <i className="ri ri-palette-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const BlendIcon = <i className="ri ri-mix-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const RequisitionIcon = <i className="ri ri-file-list-3-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const QCIcon = <i className="ri ri-checkbox-circle-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const StorageIcon = <i className="ri ri-stack-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const WarehouseIcon = <i className="bx bx-store side-menu__icon"></i>;
const OrdersIcon = <i className="ri ri-file-list-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const PickPackIcon = <i className="ri ri-handbag-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const LayoutIcon = <i className="ri ri-layout-grid-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const StockIcon = <i className="ri ri-stack-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const ReportsIcon = <i className="ri ri-file-chart-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const InwardIcon = <i className="ri ri-inbox-unarchive-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const ClientsIcon = <i className="ri ri-contacts-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const VendorPOIcon = <i className="ri ri-truck-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const VendorListIcon = <i className="ri ri-list-unordered side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const RaiseIcon = <i className="ri ri-upload-2-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const ReceiveIcon = <i className="ri ri-download-2-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const CheckingIcon = <i className="ri ri-check-double-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const GRNIcon = <i className="ri ri-file-text-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const DraftPOIcon = <i className="ri ri-draft-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const BrandingIcon = <i className="ri ri-price-tag-3-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const FinalCheckIcon = <i className="ri ri-task-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const DispatchIcon = <i className="ri ri-truck-fill side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const WashingIcon = <i className="ri ri-water-flash-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const BoardingIcon = <i className="ri ri-airplay-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
// Badges if needed
const badge = (
  <span className="badge !bg-warning/10 !text-warning !py-[0.25rem] !px-[0.45rem] !text-[0.75em] ms-1">
    New
  </span>
);

const BaseMenuItems: any = [
  {
    menutitle: "MAIN",
  },
  {
    icon: DashboardIcon,
    title: "Dashboard",
    type: "link",
    active: false,
    selected: false,
    path: "/dashboards/main",
  },
  {
    icon: CatalogIcon,
    title: "Master Catalog",
    type: "sub",
    active: false,
    selected: false,
    children: [
      {
        icon: ItemsIcon,
        path: "/catalog/items",
        type: "link",
        active: false,
        selected: false,
        title: "Items",
      },
      {
        icon: CategoriesIcon,
        path: "/catalog/categories",
        type: "link",
        active: false,
        selected: false,
        title: "Categories",
      },
      {
        icon: MaterialIcon,
        path: "/catalog/raw-material",
        type: "link",
        active: false,
        selected: false,
        title: "Raw Material",
      },
      {
        icon: ProcessIcon,
        path: "/catalog/processes",
        type: "link",
        active: false,
        selected: false,
        title: "Processes",
      },
      {
        icon: AttributeIcon,
        path: "/catalog/attributes",
        type: "link",
        active: false,
        selected: false,
        title: "Attributes",
      },
      {
        icon: StyleCodeIcon,
        path: "/catalog/style-codes",
        type: "link",
        active: false,
        selected: false,
        title: "Style Codes",
      },
      {
        icon: StyleCodeIcon,
        path: "/catalog/style-code-pairs",
        type: "link",
        active: false,
        selected: false,
        title: "Style Code Pairs",
      },
      {
        icon: MachinesIcon,
        path: "/catalog/machines",
        type: "link",
        active: false,
        selected: false,
        title: "Machines",
      },
      {
        icon: AttributeIcon,
        path: "/catalog/needle-configuration",
        type: "link",
        active: false,
        selected: false,
        title: "Needle Configuration",
      },
      {
        icon: TeamMasterIcon,
        path: "/catalog/team-master",
        type: "link",
        active: false,
        selected: false,
        title: "Team Master",
      },
      {
        icon: ContainersMasterIcon,
        path: "/catalog/containers-master",
        type: "link",
        active: false,
        selected: false,
        title: "Containers Master",
      },
      {
        icon: CataloguingIcon,
        path: "/yarn-management/cataloguing",
        type: "link",
        active: false,
        selected: false,
        title: "Yarn Cataloguing",
      },
      {
        icon: YarnIcon,
        title: "Yarn Master",
        type: "sub",
        active: false,
        selected: false,
        path: "/yarn-management/yarn-master",
        children: [
          {
            icon: BrandIcon,
            path: "/yarn-management/yarn-master/brand",
            type: "link",
            active: false,
            selected: false,
            title: "Brand/Supplier",
          },
          {
            icon: YarnTypeIcon,
            path: "/yarn-management/yarn-master/yarn-type",
            type: "link",
            active: false,
            selected: false,
            title: "Yarn Type",
          },
          {
            icon: CountSizeIcon,
            path: "/yarn-management/yarn-master/count-size",
            type: "link",
            active: false,
            selected: false,
            title: "Count/Size",
          },
          {
            icon: ColorIcon,
            path: "/yarn-management/yarn-master/color",
            type: "link",
            active: false,
            selected: false,
            title: "Color",
          },
          {
            icon: LayoutIcon,
            path: "/yarn-management/yarn-master/blend",
            type: "link",
            active: false,
            selected: false,
            title: "Blend",
          },
        ],
      },
    ],
  },
  {
    icon: SalesIcon,
    title: "Sales",
    type: "sub",
    active: false,
    selected: false,
    children: [
      {
        icon: SalesIcon,
        path: "/sales",
        type: "link",
        active: false,
        selected: false,
        title: "All Sales",
      },
      {
        icon: SalesIcon,
        path: "/sales/master",
        type: "link",
        active: false,
        selected: false,
        title: "Master Sales",
      },
    ],
  },
  {
    icon: StoresIcon,
    title: "Stores",
    type: "link",
    active: false,
    selected: false,
    path: "/stores",
  },
  {
    icon: AnalyticsIcon,
    title: "Analytics",
    type: "link",
    active: false,
    selected: false,
    path: "/analytics",
  },
  {
    icon: ReplenishmentIcon,
    title: "Replenishment Agent",
    type: "link",
    active: false,
    selected: false,
    path: "/replenishment",
  },
  {
    icon: FilemanagerIcon,
    title: "File Manager",
    type: "link",
    active: false,
    selected: false,
    path: "/filemanager",
  },
  {
    icon: UsersIcon,
    title: "Users",
    type: "link",
    active: false,
    selected: false,
    path: "/users",
  },
  {
    icon: SupervisorIcon,
    title: "Production Planning",
    type: "sub",
    active: false,
    selected: false,
    path: "/production",
    children: [
      {
        icon: ProductionIcon,
        path: "/production/supervisor",
        type: "link",
        active: false,
        selected: false,
        title: "Production Orders",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/knitting",
        type: "link",
        active: false,
        selected: false,
        title: "Knitting Floor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/linking",
        type: "link",
        active: false,
        selected: false,
        title: "Linking Floor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/checking",
        type: "link",
        active: false,
        selected: false,
        title: "Checking Floor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/washing",
        type: "link",
        active: false,
        selected: false,
        title: "Washing Floor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/boarding",
        type: "link",
        active: false,
        selected: false,
        title: "Boarding Floor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/silicon",
        type: "link",
        active: false,
        selected: false,
        title: "Silicon Floor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/secondary-checking",
        type: "link",
        active: false,
        selected: false,
        title: "Secondary Checking Floor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/branding",
        type: "link",
        active: false,
        selected: false,
        title: "Branding Floor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/final-checking",
        type: "link",
        active: false,
        selected: false,
        title: "Final Checking Floor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/dispatch",
        type: "link",
        active: false,
        selected: false,
        title: "Dispatch Floor",
      },
      // Warehouse Floor – commented out from navbar
      // {
      //   icon: FloorIcon,
      //   path: "/production/floor-supervisor/warehouse",
      //   type: "link",
      //   active: false,
      //   selected: false,
      //   title: "Warehouse Floor",
      // },
      // Machine Floor – commented out from navbar
      // {
      //   icon: FloorIcon,
      //   path: "/production/floor-supervisor/machine-floor",
      //   type: "link",
      //   active: false,
      //   selected: false,
      //   title: "Machine Floor",
      // },
    ],
  },
  {
    icon: AnalyticsIcon,
    title: "Yarn Management",
    type: "sub",
    active: false,
    selected: false,
    path: "/yarn-management",
    children: [
      {
        icon: PurchaseIcon,
        title: "Purchase Management",
        type: "sub",
        active: false,
        selected: false,
        path: "/yarn-management/purchase-management",
        children: [
          {
            icon: RequisitionIcon,
            path: "/yarn-management/purchase-management/requisition-list",
            type: "link",
            active: false,
            selected: false,
            title: "Requisition list",
          },
          {
            icon: PurchaseIcon,
            path: "/yarn-management/purchase-management/purchase",
            type: "link",
            active: false,
            selected: false,
            title: "All POs",
          },
          {
            icon: PurchaseReceivedIcon,
            path: "/yarn-management/purchase-management/purchase-order-received",
            type: "link",
            active: false,
            selected: false,
            title: "PO Received",
          },
          {
            icon: DraftPOIcon,
            path: "/yarn-management/purchase-management/draft-pos",
            type: "link",
            active: false,
            selected: false,
            title: "Draft POs",
          },
          {
            icon: PurchaseReceivedIcon,
            path: "/yarn-management/grn",
            type: "link",
            active: false,
            selected: false,
            title: "GRN History",
          },
          {
            icon: QCIcon,
            path: "/yarn-management/purchase-management/yarn-qc",
            type: "link",
            active: false,
            selected: false,
            title: "Yarn QC",
          },
        ],
      },
      {
        icon: IssueIcon,
        title: "Yarn Issue",
        type: "sub",
        active: false,
        selected: false,
        path: "/yarn-management/yarn-issue",
        children: [
          {
            icon: IssueIcon,
            path: "/yarn-management/yarn-issue",
            type: "link",
            active: false,
            selected: false,
            title: "Issue for orders",
          },
          {
            icon: IssueIcon,
            path: "/yarn-management/yarn-issue/linking-sampling",
            type: "link",
            active: false,
            selected: false,
            title: "Linking & sampling",
          },
        ],
      },
      {
        icon: ReturnIcon,
        path: "/yarn-management/yarn-return",
        type: "link",
        active: false,
        selected: false,
        title: "Yarn Return",
      },
      {
        icon: StorageIcon,
        path: "/yarn-management/purchase-management/yarn-storage",
        type: "link",
        active: false,
        selected: false,
        title: "Yarn Storage",
      },
      {
        icon: ReportsIcon,
        title: "Analytics & reports",
        type: "sub",
        active: false,
        selected: false,
        path: "/yarn-management/dashboard",
        children: [
          {
            icon: YarnDashboardIcon,
            path: "/yarn-management/dashboard",
            type: "link",
            active: false,
            selected: false,
            title: "Live Inventory",
          },
          {
            icon: ReportsIcon,
            path: "/yarn-management/dashboard/report",
            type: "link",
            active: false,
            selected: false,
            title: "Yarn Stock Report",
          },
          {
            icon: InventoryIcon,
            path: "/yarn-management/dashboard/analytics?tab=purchase-orders",
            type: "link",
            active: false,
            selected: false,
            title: "PO Analytics",
          },
          {
            icon: YarnIcon,
            path: "/yarn-management/dashboard/analytics?tab=yarn",
            type: "link",
            active: false,
            selected: false,
            title: "Yarn Analytics",
          },
        ],
      },
    ],
  },
  {
    icon: VendorPOIcon,
    title: "Vendor PO",
    type: "sub",
    active: false,
    selected: false,
    path: "/vendor-po",
    children: [
      {
        icon: PurchaseIcon,
        title: "Purchase Management",
        type: "sub",
        active: false,
        selected: false,
        path: "/vendor-po/purchase-management",
        children: [
          {
            icon: VendorListIcon,
            path: "/vendor-po/vendor-list",
            type: "link",
            active: false,
            selected: false,
            title: "Vendor List",
          },
          {
            icon: PurchaseIcon,
            path: "/vendor-po/purchase-management/purchase",
            type: "link",
            active: false,
            selected: false,
            title: "Vendor PO Raise",
          },
          {
            icon: PurchaseReceivedIcon,
            path: "/vendor-po/purchase-management/purchase-order-received",
            type: "link",
            active: false,
            selected: false,
            title: "Vendor PO Receive",
          },
        ],
      },
      {
        icon: CheckingIcon,
        path: "/vendor-po/secondary-checking",
        type: "link",
        active: false,
        selected: false,
        title: "Secondary Checking",
      },
      {
        icon: WashingIcon,
        path: "/vendor-po/washing",
        type: "link",
        active: false,
        selected: false,
        title: "Washing",
      },
      {
        icon: BoardingIcon,
        path: "/vendor-po/boarding",
        type: "link",
        active: false,
        selected: false,
        title: "Boarding",
      },
      {
        icon: BrandingIcon,
        path: "/vendor-po/branding",
        type: "link",
        active: false,
        selected: false,
        title: "Branding",
      },
      {
        icon: FinalCheckIcon,
        path: "/vendor-po/final-checking",
        type: "link",
        active: false,
        selected: false,
        title: "Final Checking",
      },
      {
        icon: DispatchIcon,
        path: "/vendor-po/dispatch",
        type: "link",
        active: false,
        selected: false,
        title: "Dispatch",
      },
      {
        icon: GRNIcon,
        path: "/vendor-po/grn",
        type: "link",
        active: false,
        selected: false,
        title: "GRN",
      },
    ],
  },
  {
    icon: WarehouseIcon,
    title: "WHMS",
    type: "sub",
    active: false,
    selected: false,
    path: "/warehouse-management",
    children: [
      {
        icon: OrdersIcon,
        path: "/warehouse-management/orders",
        type: "link",
        active: false,
        selected: false,
        title: "Orders",
      },
      {
        icon: InwardIcon,
        path: "/warehouse-management/inward",
        type: "link",
        active: false,
        selected: false,
        title: "Inward",
      },
      {
        icon: ClientsIcon,
        path: "/warehouse-management/clients",
        type: "link",
        active: false,
        selected: false,
        title: "Clients",
      },
      {
        icon: PickPackIcon,
        path: "/warehouse-management/pick-pack",
        type: "link",
        active: false,
        selected: false,
        title: "Pick&Pack",
      },
      {
        icon: LayoutIcon,
        path: "/warehouse-management/layout",
        type: "link",
        active: false,
        selected: false,
        title: "Layout",
      },
      {
        icon: StockIcon,
        path: "/warehouse-management/stock",
        type: "link",
        active: false,
        selected: false,
        title: "Stock",
      },
      {
        icon: ReportsIcon,
        path: "/warehouse-management/reports",
        type: "link",
        active: false,
        selected: false,
        title: "Reports",
      },
    ],
  },
];

// Hook to get filtered menu items based on navigation permissions
export const useMenuItems = () => {
  const filteredItems = useNavigationMenu(BaseMenuItems);
  console.log('useMenuItems - BaseMenuItems length:', BaseMenuItems.length);
  console.log('useMenuItems - filteredItems length:', filteredItems?.length);
  return filteredItems || BaseMenuItems; // Fallback to base items if filtered is empty
};

// Export the base menu items for backward compatibility
export const MenuItems = BaseMenuItems;
