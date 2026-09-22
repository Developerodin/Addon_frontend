type ThemeAttrs = Record<string, unknown> & {
  dir?: string;
  class?: string;
  dataHeaderStyles?: string;
  dataVerticalStyle?: string;
  dataNavLayout?: string;
  dataMenuStyles?: string;
  dataToggled?: string;
  dataNavStyle?: string;
  horStyle?: string;
  dataPageStyle?: string;
  dataWidth?: string;
  dataMenuPosition?: string;
  dataHeaderPosition?: string;
  iconOverlay?: string;
  bgImg?: string;
  iconText?: string;
  colorPrimaryRgb?: string;
  colorPrimary?: string;
  darkBg?: string;
  bodyBg?: string;
  inputBorder?: string;
  Light?: string;
};

/**
 * Sets or clears one attribute on the real document element.
 */
function setAttr(root: HTMLElement, name: string, value?: string): void {
  if (value) {
    root.setAttribute(name, value);
    return;
  }
  root.removeAttribute(name);
}

/**
 * Copies Ynex theme attributes onto the real `<html>` node.
 * Layout renders a nested `<html>`, which the browser drops, so selectors
 * like `[data-vertical-style][data-toggled]` never match and the sidebar
 * stays open while only the page margin moves.
 */
export function syncThemeToDocument(theme: ThemeAttrs): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  setAttr(root, "dir", theme.dir);
  setAttr(root, "data-header-styles", theme.dataHeaderStyles);
  setAttr(root, "data-vertical-style", theme.dataVerticalStyle);
  setAttr(root, "data-nav-layout", theme.dataNavLayout);
  setAttr(root, "data-menu-styles", theme.dataMenuStyles);
  setAttr(root, "data-toggled", theme.dataToggled);
  setAttr(root, "data-nav-style", theme.dataNavStyle);
  setAttr(root, "hor-style", theme.horStyle);
  setAttr(root, "data-page-style", theme.dataPageStyle);
  setAttr(root, "data-width", theme.dataWidth);
  setAttr(root, "data-menu-position", theme.dataMenuPosition);
  setAttr(root, "data-header-position", theme.dataHeaderPosition);
  setAttr(root, "data-icon-overlay", theme.iconOverlay);
  setAttr(root, "bg-img", theme.bgImg);
  setAttr(root, "data-icon-text", theme.iconText);

  root.classList.remove("light", "dark");
  if (theme.class === "dark" || theme.class === "light") {
    root.classList.add(theme.class);
  }

  const vars: Record<string, string | undefined> = {
    "--primary-rgb": theme.colorPrimaryRgb,
    "--primary": theme.colorPrimary,
    "--dark-bg": theme.darkBg,
    "--body-bg": theme.bodyBg,
    "--input-border": theme.inputBorder,
    "--light": theme.Light,
  };
  for (const [prop, value] of Object.entries(vars)) {
    if (value) root.style.setProperty(prop, value);
    else root.style.removeProperty(prop);
  }
}
