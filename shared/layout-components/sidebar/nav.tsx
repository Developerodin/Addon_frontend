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
        path: "/production/floor-supervisor/warehouse",
        type: "link",
        active: false,
        selected: false,
        title: "Warehouse Floor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/machine-floor",
        type: "link",
        active: false,
        selected: false,
        title: "Machine Floor",
      },
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
        icon: YarnDashboardIcon,
        path: "/yarn-management/dashboard",
        type: "link",
        active: false,
        selected: false,
        title: "Dashboard",
      },
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
            title: "Purchase Order",
          },
          {
            icon: PurchaseReceivedIcon,
            path: "/yarn-management/purchase-management/purchase-order-received",
            type: "link",
            active: false,
            selected: false,
            title: "Purchase Order Recevied",
          },
          {
            icon: QCIcon,
            path: "/yarn-management/purchase-management/yarn-qc",
            type: "link",
            active: false,
            selected: false,
            title: "Yarn QC",
          },
          {
            icon: StorageIcon,
            path: "/yarn-management/purchase-management/yarn-storage",
            type: "link",
            active: false,
            selected: false,
            title: "Yarn Storage",
          },
        ],
      },
      {
        icon: IssueIcon,
        path: "/yarn-management/yarn-issue",
        type: "link",
        active: false,
        selected: false,
        title: "Yarn Issue",
      },
      {
        icon: ReturnIcon,
        path: "/yarn-management/yarn-return",
        type: "link",
        active: false,
        selected: false,
        title: "Yarn Return",
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
