import React from "react";

const DashboardIcon = <i className="bx bx-home side-menu__icon"></i>;
const CatalogIcon = <i className="bx bx-package side-menu__icon"></i>;
const ItemsIcon = <i className="bx bx-box side-menu__icon"></i>;
const CategoriesIcon = <i className="bx bx-category side-menu__icon"></i>;
const MaterialIcon = <i className="bx bx-layer side-menu__icon"></i>;
const ProcessIcon = <i className="bx bx-cog side-menu__icon"></i>;
const AttributeIcon = <i className="bx bx-list-ul side-menu__icon"></i>;
const SalesIcon = <i className="bx bx-cart side-menu__icon"></i>;
const StoresIcon = <i className="bx bx-store side-menu__icon"></i>;
const AnalyticsIcon = <i className="bx bx-bar-chart side-menu__icon"></i>;
const ReplenishmentIcon = <i className="bx bx-refresh side-menu__icon"></i>;
const FilemanagerIcon = <i className="ri ri-file-line side-menu__icon" style={{ marginTop: "-10px" }}></i>;
const SupervisorIcon = <i className="bx bx-user-check side-menu__icon"></i>;
const ProductionIcon = <i className="bx bx-cog side-menu__icon"></i>;
const FloorIcon = <i className="bx bx-building side-menu__icon"></i>;
// Badges if needed
const badge = (
  <span className="badge !bg-warning/10 !text-warning !py-[0.25rem] !px-[0.45rem] !text-[0.75em] ms-1">
    New
  </span>
);

export const MenuItems: any = [
  {
    menutitle: "MAIN",
  },
  {
    icon: DashboardIcon,
    title: "Dashboard",
    type: "link",
    active: false,
    selected: false,
    path: "/dashboard",
  },
  {
    icon: CatalogIcon,
    title: "Catalog",
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
    icon: SupervisorIcon,
    title: "Supervisors",
    type: "sub",
    active: false,
    selected: false,
    children: [
      {
        icon: ProductionIcon,
        path: "/production/supervisor",
        type: "link",
        active: false,
        selected: false,
        title: "Production Supervisor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/knitting",
        type: "link",
        active: false,
        selected: false,
        title: "Knitting Floor Supervisor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/linking",
        type: "link",
        active: false,
        selected: false,
        title: "Linking Floor Supervisor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/checking",
        type: "link",
        active: false,
        selected: false,
        title: "Checking Floor Supervisor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/washing",
        type: "link",
        active: false,
        selected: false,
        title: "Washing Floor Supervisor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/boarding",
        type: "link",
        active: false,
        selected: false,
        title: "Boarding Floor Supervisor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/final-checking",
        type: "link",
        active: false,
        selected: false,
        title: "Final Checking Floor Supervisor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/branding",
        type: "link",
        active: false,
        selected: false,
        title: "Branding Floor Supervisor",
      },
      {
        icon: FloorIcon,
        path: "/production/floor-supervisor/warehouse",
        type: "link",
        active: false,
        selected: false,
        title: "Warehouse Floor Supervisor",
      },
    ],
  },
];
