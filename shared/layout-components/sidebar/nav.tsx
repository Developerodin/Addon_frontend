import React from "react";

const DashboardIcon = <i className="bx bx-home side-menu__icon"></i>;
const CatalogIcon = <i className="bx bx-package side-menu__icon"></i>;
const ItemsIcon = <i className="bx bx-box side-menu__icon"></i>;
const CategoriesIcon = <i className="bx bx-category side-menu__icon"></i>;
const MaterialIcon = <i className="bx bx-layer side-menu__icon"></i>;
const ProcessIcon = <i className="bx bx-cog side-menu__icon"></i>;
const AttributeIcon = <i className="bx bx-list-ul side-menu__icon"></i>;
const SalesIcon = <i className="bx bx-cart side-menu__icon"></i>;
const AnalyticsIcon = <i className="bx bx-bar-chart side-menu__icon"></i>;
const ReplenishmentIcon = <i className="bx bx-refresh side-menu__icon"></i>;

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
    type: "link",
    active: false,
    selected: false,
    path: "/sales",
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
    title: "Replenishment",
    type: "link",
    active: false,
    selected: false,
    path: "/replenishment",
  },
];
