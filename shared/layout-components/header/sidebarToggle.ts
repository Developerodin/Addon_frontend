import store from "@/shared/redux/store";
import { syncThemeToDocument } from "./syncThemeToDocument";

type ThemeChangerFn = (theme: Record<string, unknown>) => void;

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
    const next = { ...theme, dataToggled, iconOverlay: "" };
    ThemeChanger(next);
    syncThemeToDocument(next);
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
  const next = { ...theme, dataToggled, iconOverlay: "" };
  ThemeChanger(next);
  syncThemeToDocument(next);
}
