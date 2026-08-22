import store from "@/shared/redux/store";

type ThemeChangerFn = (theme: Record<string, unknown>) => void;

/**
 * Writes sidebar attributes onto the real <html> node.
 * Nested layout <html> tags are ignored by the browser in production,
 * so CSS [data-toggled] would never apply without this.
 */
function syncToggleAttrs(dataToggled: string, iconOverlay = ""): void {
  const root = document.documentElement;
  if (dataToggled) {
    root.setAttribute("data-toggled", dataToggled);
  } else {
    root.removeAttribute("data-toggled");
  }
  if (iconOverlay) {
    root.setAttribute("data-icon-overlay", iconOverlay);
  } else {
    root.removeAttribute("data-icon-overlay");
  }
}

/**
 * Toggles the mobile overlay class used below the 992px breakpoint.
 */
function setMobileOverlay(active: boolean): void {
  const overlay = document.querySelector("#responsive-overlay");
  if (!overlay) return;
  overlay.classList.toggle("active", active);
}

/**
 * Toggles the Ynex sidebar. Applies Redux + html attributes synchronously
 * so production (minified, no nested-<html> hydration) matches `next dev`.
 */
export function toggleSidebar(ThemeChanger: ThemeChangerFn): void {
  const theme = store.getState() as Record<string, unknown>;
  const isDesktop = window.innerWidth >= 992;
  const verticalStyle = String(theme.dataVerticalStyle || "overlay");
  const navStyle = String(theme.dataNavStyle || "");
  const current = String(theme.dataToggled || "");

  if (!isDesktop) {
    const opening = current === "close" || current === "";
    const dataToggled = opening ? "open" : "close";
    ThemeChanger({ ...theme, dataToggled });
    syncToggleAttrs(dataToggled);
    setMobileOverlay(opening);
    return;
  }

  const closedByStyle: Record<string, string> = {
    overlay: "icon-overlay-close",
    closed: "close-menu-close",
    icontext: "icon-text-close",
    detached: "detached-close",
    doublemenu: "double-menu-close",
  };

  const closedByNav: Record<string, string> = {
    "menu-click": "menu-click-closed",
    "menu-hover": "menu-hover-closed",
    "icon-click": "icon-click-closed",
    "icon-hover": "icon-hover-closed",
  };

  const closedValue = closedByNav[navStyle] || closedByStyle[verticalStyle] || "icon-overlay-close";
  const dataToggled = current === closedValue ? "" : closedValue;

  ThemeChanger({
    ...theme,
    dataToggled,
    iconOverlay: "",
    ...(navStyle ? {} : { dataNavStyle: theme.dataNavStyle }),
  });
  syncToggleAttrs(dataToggled, "");
}
