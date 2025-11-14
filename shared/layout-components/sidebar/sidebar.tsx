"use client"
import React, { Fragment, useState, useEffect } from "react";
import { connect } from "react-redux";
import { ThemeChanger } from "../../redux/action";
import Link from "next/link";
import { basePath } from "@/next.config";
import store from "@/shared/redux/store";
import SimpleBar from 'simplebar-react';
import Menuloop from "./menuloop";
import { usePathname, useRouter } from "next/navigation";
import { useMenuItems } from "./nav";
import { useNavigation } from "@/shared/contextapi/navigationContext";

const Sidebar = ({ local_varaiable, ThemeChanger }: any) => {
	const filteredMenuItems = useMenuItems();
	const [menuitems, setMenuitems] = useState(filteredMenuItems || []);
	const { isLoading } = useNavigation();

	const path = usePathname()	

	function closeMenu(keepSelectedActive = false) {
		console.log('🔴 closeMenu() called', { 
			keepSelectedActive, 
			stack: new Error().stack?.split('\n').slice(0, 8).join('\n')
		});
		const closeMenudata = (items: any) => {
			items?.forEach((item: any) => {
				// Don't close menus that are selected or have selected children
				if (keepSelectedActive && (item.selected || hasSelectedChild(item))) {
					console.log('✅ Keeping menu open:', item.title, 'selected:', item.selected, 'hasSelectedChild:', hasSelectedChild(item));
					// Keep this menu open - don't set active to false
					// But still process children
					if (item.children) {
						closeMenudata(item.children);
					}
					return;
				}
				// Only close if not selected and doesn't have selected children
				if (!item.selected && !hasSelectedChild(item)) {
					console.log('❌ Closing menu:', item.title, 'active:', item.active);
					item.active = false;
					if (item.children) {
						closeMenudata(item.children);
					}
				} else {
					console.log('⚠️ Skipping close for:', item.title, 'selected:', item.selected);
					if (item.children) {
						closeMenudata(item.children);
					}
				}
			});
		};
		closeMenudata(menuitems.length > 0 ? menuitems : filteredMenuItems);
		setMenuitems((arr: any) => [...arr]);
		console.log('🔴 closeMenu() completed');
	}

	function hasSelectedChild(item: any): boolean {
		if (!item.children) return false;
		return item.children.some((child: any) => child.selected || hasSelectedChild(child));
	}

	useEffect(() => {
		console.log('🔄 Menu items filtered, updating state', { 
			filteredLength: filteredMenuItems?.length,
			currentLength: menuitems?.length 
		});
		// Preserve active/selected state when menu items are re-filtered
		if (filteredMenuItems && menuitems.length > 0) {
			const preserveMenuState = (newItems: any[], oldItems: any[]) => {
				newItems.forEach((newItem: any) => {
					const oldItem = oldItems.find((old: any) => 
						old.path === newItem.path || old.title === newItem.title
					);
					if (oldItem) {
						// Preserve active and selected state
						newItem.active = oldItem.active;
						newItem.selected = oldItem.selected;
						if (newItem.children && oldItem.children) {
							preserveMenuState(newItem.children, oldItem.children);
						}
					}
				});
			};
			preserveMenuState(filteredMenuItems, menuitems);
			console.log('✅ Preserved menu state after filtering');
		}
		setMenuitems(filteredMenuItems || []);
	}, [filteredMenuItems]);

	useEffect(() => {

		window.addEventListener('resize', menuResizeFn);
		window.addEventListener('resize', checkHoriMenu);
		const mainContent = document.querySelector(".main-content");
		if (window.innerWidth <= 992) {
			if (mainContent) {
				const theme = store.getState();
				ThemeChanger({ ...theme, dataToggled: "close" });
			}
			else if (document.documentElement.getAttribute('data-nav-layout') == 'horizontal') {
				closeMenu(true); // Keep selected menus open
			}
		}
		mainContent!.addEventListener('click', (e) => {
			console.log('🖱️ Main content clicked', {
				target: (e.target as HTMLElement)?.tagName,
				className: (e.target as HTMLElement)?.className
			});
			menuClose(e);
		});
		return () => {
			window.removeEventListener("resize", menuResizeFn);
			window.removeEventListener('resize', checkHoriMenu);
		};
	}, []);

	const router = useRouter();
	const pathname = usePathname()

	function Onhover() {

		const theme = store.getState();
		if ((theme.dataToggled == 'icon-overlay-close' || theme.dataToggled == 'detached-close') && theme.iconOverlay != 'open') {
			ThemeChanger({ ...theme, "iconOverlay": "open" });
		}
	}
	function Outhover() {

		const theme = store.getState();
		if ((theme.dataToggled == 'icon-overlay-close' || theme.dataToggled == 'detached-close') && theme.iconOverlay == 'open') {
			ThemeChanger({ ...theme, "iconOverlay": "" });
		}
	}

	function menuClose(event?: Event) {
		console.log('🟡 menuClose() called', { 
			hasEvent: !!event, 
			target: event?.target,
			tagName: (event?.target as HTMLElement)?.tagName,
			className: (event?.target as HTMLElement)?.className,
			stack: new Error().stack?.split('\n').slice(0, 5).join('\n')
		});
		// Don't close if click is inside the sidebar or on menu items/links
		if (event && event.target) {
			const sidebar = document.querySelector(".app-sidebar");
			const clickedElement = event.target as HTMLElement;
			const isInSidebar = sidebar?.contains(clickedElement);
			const isInAppSidebar = clickedElement.closest(".app-sidebar");
			const isMenuItem = clickedElement.closest(".side-menu__item");
			const isLink = clickedElement.closest("a[href]") || clickedElement.tagName === "A";
			
			console.log('🔍 Click detection:', {
				isInSidebar,
				isInAppSidebar: !!isInAppSidebar,
				isMenuItem: !!isMenuItem,
				isLink,
				clickedElement: clickedElement.tagName
			});
			
			if (sidebar && (
				isInSidebar || 
				isInAppSidebar ||
				isMenuItem ||
				isLink
			)) {
				console.log('✅ Preventing menu close - click is inside sidebar/menu');
				return;
			}
		}
		const theme = store.getState();
		console.log('📊 Theme state:', {
			dataNavLayout: theme.dataNavLayout,
			dataNavStyle: theme.dataNavStyle,
			dataToggled: theme.dataToggled,
			windowWidth: window.innerWidth
		});
		// Only close sidebar on mobile when clicking outside
		if (window.innerWidth <= 992) {
			console.log('📱 Mobile: Closing sidebar');
			ThemeChanger({ ...theme, dataToggled: "close" });
		}
		const overlayElement = document.querySelector("#responsive-overlay") as HTMLElement | null;
		if (overlayElement) {
			overlayElement.classList.remove("active");
		}
		// Only close menu items for horizontal layout with click styles, NOT for vertical
		// NEVER close menus for vertical layout - they should stay open
		if (theme.dataNavLayout == "horizontal" && (theme.dataNavStyle == "menu-click" || theme.dataNavStyle == "icon-click")) {
			console.log('🟠 Horizontal layout: Calling closeMenu(true)');
			closeMenu(true); // Keep selected menus open
		} else {
			console.log('✅ Vertical layout: NOT closing menus');
		}
		// For vertical layout, never close menus when clicking outside
	}

	const WindowPreSize = typeof window !== 'undefined' ? [window.innerWidth] : [];

	function menuResizeFn() {

		if (typeof window === 'undefined') {
			// Handle the case where window is not available (server-side rendering)
			return;
		}

		WindowPreSize.push(window.innerWidth);
		if (WindowPreSize.length > 2) { WindowPreSize.shift() }

		const theme = store.getState();
		const currentWidth = WindowPreSize[WindowPreSize.length - 1];
		const prevWidth = WindowPreSize[WindowPreSize.length - 2];


		if (WindowPreSize.length > 1) {
			if (currentWidth < 992 && prevWidth >= 992) {
				// less than 992;
				ThemeChanger({ ...theme, dataToggled: "close" });
			}

			if (currentWidth >= 992 && prevWidth < 992) {
				// greater than 992
				ThemeChanger({ ...theme, dataToggled: theme.dataVerticalStyle === "doublemenu" ? "double-menu-open" : "" });

			}
		}
	}

	function switcherArrowFn(): void {

		// Used to remove is-expanded class and remove class on clicking arrow buttons
		function slideClick(): void {
			const slide = document.querySelectorAll<HTMLElement>(".slide");
			const slideMenu = document.querySelectorAll<HTMLElement>(".slide-menu");

			slide.forEach((element) => {
				if (element.classList.contains("is-expanded")) {
					element.classList.remove("is-expanded");
				}
			});

			slideMenu.forEach((element) => {
				if (element.classList.contains("open")) {
					element.classList.remove("open");
					element.style.display = "none";
				}
			});
		}

		slideClick();
	}

	const checkHoriMenu = () => {
		const menuNav = document.querySelector(".main-menu") as HTMLElement;
		const mainContainer1 = document.querySelector(".main-sidebar") as HTMLElement;

		const marginLeftValue = Math.ceil(
			Number(window.getComputedStyle(menuNav).marginLeft.split("px")[0])
		);
		const marginRightValue = Math.ceil(
			Number(window.getComputedStyle(menuNav).marginRight.split("px")[0])
		);
		const check = menuNav.scrollWidth - mainContainer1.offsetWidth;

		// Show/Hide the arrows
		if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
		} else {
			menuNav.style.marginLeft = "0px";
			menuNav.style.marginRight = "0px";
			menuNav.style.marginInlineStart = "0px";
		}

		if (!(document.querySelector("html")?.getAttribute("dir") === "rtl")) {
			// LTR check the width and adjust the menu in screen
			if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
				if (Math.abs(check) < Math.abs(marginLeftValue)) {
					menuNav.style.marginLeft = -check + "px";
				}
			}

		} else {
			// RTL check the width and adjust the menu in screen
			if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
				if (Math.abs(check) < Math.abs(marginRightValue)) {
					menuNav.style.marginRight = -check + "px";
				}
			}

		}

	};

	function slideRight(): void {
		const menuNav = document.querySelector<HTMLElement>(".main-menu");
		const mainContainer1 = document.querySelector<HTMLElement>(".main-sidebar");

		if (menuNav && mainContainer1) {
			const marginLeftValue = Math.ceil(
				Number(window.getComputedStyle(menuNav).marginInlineStart.split("px")[0])
			);
			const marginRightValue = Math.ceil(
				Number(window.getComputedStyle(menuNav).marginInlineEnd.split("px")[0])
			);
			const check = menuNav.scrollWidth - mainContainer1.offsetWidth;
			let mainContainer1Width = mainContainer1.offsetWidth;

			if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
				if (!(local_varaiable.dataVerticalStyle.dir === "rtl")) {
					if (Math.abs(check) > Math.abs(marginLeftValue)) {
						menuNav.style.marginInlineEnd = "0";

						if (!(Math.abs(check) > Math.abs(marginLeftValue) + mainContainer1Width)) {
							mainContainer1Width = Math.abs(check) - Math.abs(marginLeftValue);
							const slideRightButton = document.querySelector<HTMLElement>("#slide-right");
							if (slideRightButton) {
								slideRightButton.classList.add("hidden");
							}
						}

						menuNav.style.marginInlineStart =
							(Number(menuNav.style.marginInlineStart.split("px")[0]) -
								Math.abs(mainContainer1Width)) +
							"px";

						const slideRightButton = document.querySelector<HTMLElement>("#slide-right");
						if (slideRightButton) {
							slideRightButton.classList.remove("hidden");
						}
					}
				} else {
					if (Math.abs(check) > Math.abs(marginRightValue)) {
						menuNav.style.marginInlineEnd = "0";

						if (!(Math.abs(check) > Math.abs(marginRightValue) + mainContainer1Width)) {
							mainContainer1Width = Math.abs(check) - Math.abs(marginRightValue);
							const slideRightButton = document.querySelector<HTMLElement>("#slide-right");
							if (slideRightButton) {
								slideRightButton.classList.add("hidden");
							}
						}

						menuNav.style.marginInlineStart =
							(Number(menuNav.style.marginInlineStart.split("px")[0]) -
								Math.abs(mainContainer1Width)) +
							"px";

						const slideLeftButton = document.querySelector<HTMLElement>("#slide-left");
						if (slideLeftButton) {
							slideLeftButton.classList.remove("hidden");
						}
					}
				}
			}

			const element = document.querySelector<HTMLElement>(".main-menu > .slide.open");
			const element1 = document.querySelector<HTMLElement>(".main-menu > .slide.open > ul");
			if (element) {
				element.classList.remove("active");
			}
			if (element1) {
				element1.style.display = "none";
			}
		}

		switcherArrowFn();
		checkHoriMenu();
	}

	function slideLeft(): void {
		const menuNav = document.querySelector<HTMLElement>(".main-menu");
		const mainContainer1 = document.querySelector<HTMLElement>(".main-sidebar");

		if (menuNav && mainContainer1) {
			const marginLeftValue = Math.ceil(
				Number(window.getComputedStyle(menuNav).marginInlineStart.split("px")[0])
			);
			const marginRightValue = Math.ceil(
				Number(window.getComputedStyle(menuNav).marginInlineEnd.split("px")[0])
			);
			const check = menuNav.scrollWidth - mainContainer1.offsetWidth;
			let mainContainer1Width = mainContainer1.offsetWidth;

			if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
				if (!(local_varaiable.dataVerticalStyle.dir === "rtl")) {
					if (Math.abs(check) <= Math.abs(marginLeftValue)) {
						menuNav.style.marginInlineStart = "0px";
					}
				} else {
					if (Math.abs(check) > Math.abs(marginRightValue)) {
						menuNav.style.marginInlineStart = "0";

						if (!(Math.abs(check) > Math.abs(marginRightValue) + mainContainer1Width)) {
							mainContainer1Width = Math.abs(check) - Math.abs(marginRightValue);
							const slideRightButton = document.querySelector<HTMLElement>("#slide-right");
							if (slideRightButton) {
								slideRightButton.classList.add("hidden");
							}
						}

						menuNav.style.marginInlineStart =
							(Number(menuNav.style.marginInlineStart.split("px")[0]) -
								Math.abs(mainContainer1Width)) +
							"px";

						const slideLeftButton = document.querySelector<HTMLElement>("#slide-left");
						if (slideLeftButton) {
							slideLeftButton.classList.remove("hidden");
						}
					}
				}
			}

			const element = document.querySelector<HTMLElement>(".main-menu > .slide.open");
			const element1 = document.querySelector<HTMLElement>(".main-menu > .slide.open > ul");
			if (element) {
				element.classList.remove("active");
			}
			if (element1) {
				element1.style.display = "none";
			}
		}

		switcherArrowFn();
	}

	const Topup = () => {
		if (typeof window !== 'undefined') {
			if (window.scrollY > 30 && document.querySelector(".app-sidebar")) {
				const Scolls = document.querySelectorAll(".app-sidebar");
				Scolls.forEach((e) => {
					e.classList.add("sticky-pin");
				});
			} else {
				const Scolls = document.querySelectorAll(".app-sidebar");
				Scolls.forEach((e) => {
					e.classList.remove("sticky-pin");
				});
			}
		}
	};
	if (typeof window !== 'undefined') {
		window.addEventListener("scroll", Topup);
	}


	const level = 0;
	let hasParent = false;
	let hasParentLevel = 0;

	function setSubmenu(event: any, targetObject: any, menuItems = menuitems) {
		console.log('🟣 setSubmenu() called', {
			hasEvent: !!event,
			targetTitle: targetObject?.title,
			targetPath: targetObject?.path,
			menuItemsLength: menuItems?.length
		});
		const theme = store.getState();
		if ((window.screen.availWidth <= 992 || theme.dataNavStyle != "icon-hover") && (window.screen.availWidth <= 992 || theme.dataNavStyle != "menu-hover")) {
		if (!event?.ctrlKey) {
			for (const item of menuItems) {
				if (item === targetObject) {
					console.log('✅ Setting menu item active:', item.title);
					item.active = true;
					item.selected = true;
					setMenuAncestorsActive(item);
				} else if (!item.active && !item.selected) {
					item.active = false; // Set active to false for items not matching the target
					item.selected = false; // Set active to false for items not matching the target
				} else {
					removeActiveOtherMenus(item);
				}
				if (item.children && item.children.length > 0) {
					setSubmenu(event, targetObject, item.children);
				}
			}
		}
	}
		setMenuitems((arr: any) => [...arr]);
		console.log('🟣 setSubmenu() completed');
	}

	function getParentObject(obj: any, childObject: any) {
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				if (typeof obj[key] === 'object' && JSON.stringify(obj[key]) === JSON.stringify(childObject)) {
					return obj; // Return the parent object
				}
				if (typeof obj[key] === 'object') {
					const parentObject: any = getParentObject(obj[key], childObject);
					if (parentObject !== null) {
						return parentObject;
					}
				}
			}
		}
		return null; // Object not found
	}

	function setMenuAncestorsActive(targetObject: any) {
		const parent = getParentObject(menuitems, targetObject);
		const theme = store.getState();
		if (parent) {
			if (hasParentLevel > 2) {
				hasParent = true;
			}
			parent.active = true;
			parent.selected = true;
			hasParentLevel += 1;
			setMenuAncestorsActive(parent);
		}
		else if (!hasParent) {
			if (theme.dataVerticalStyle == 'doublemenu') {
				ThemeChanger({ ...theme, dataToggled: "double-menu-close" });
			}
		}
	}

	function removeActiveOtherMenus(item: any) {
		if (item) {
			if (Array.isArray(item)) {
				for (const val of item) {
					val.active = false;
					val.selected = false;
				}
			}
			item.active = false;
			item.selected = false;

			if (item.children && item.children.length > 0) {
				removeActiveOtherMenus(item.children);
			}
		}
		else {

		}
	}

	function setMenuUsingUrl(currentPath: any) {
		console.log('🔵 setMenuUsingUrl() called', { currentPath });
		hasParent = false;
		hasParentLevel = 1;
		// Check current url and trigger the setSidemenu method to active the menu.
		const setSubmenuRecursively = (items: any) => {
			items?.forEach((item: any) => {
				if (item.path == '') { }
				else if (item.path === currentPath) {
					console.log('✅ Found matching path:', item.title, item.path);
					// Mark this item as selected and active, and keep parent menus open
					item.selected = true;
					item.active = true;
					setSubmenu(null, item);
				} else {
					// Only reset selected state - don't reset active if it's a parent
					item.selected = false;
				}
				if (item.children) {
					setSubmenuRecursively(item.children);
					// If any child is selected or active, keep this parent menu open
					const hasSelectedChild = item.children.some((child: any) => child.selected || child.active);
					if (hasSelectedChild) {
						console.log('✅ Keeping parent menu open:', item.title);
						item.active = true;
					}
				}
			});
		};
		// Use current menuitems state, not filteredMenuItems
		setSubmenuRecursively(menuitems.length > 0 ? menuitems : filteredMenuItems);
		setMenuitems((arr: any) => [...arr]);
		console.log('🔵 setMenuUsingUrl() completed');
	}
	const [previousUrl, setPreviousUrl] = useState("/");

	useEffect(() => {

		// Select the target element
		const targetElement = document.documentElement;

		// Create a MutationObserver instance
		const observer = new MutationObserver(handleAttributeChange);

		// Configure the observer to watch for attribute changes
		const config = { attributes: true };

		// Start observing the target element
		observer.observe(targetElement, config);
		let currentPath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
		if (currentPath !== previousUrl) {
			setMenuUsingUrl(currentPath);
			setPreviousUrl(currentPath);
		}
	}, [pathname]);

	function toggleSidemenu(event: any, targetObject: any, menuItems = menuitems) {
		const theme = store.getState();
		let element = event.target;
		if ((theme.dataNavStyle != "icon-hover" && theme.dataNavStyle != "menu-hover") || (window.innerWidth < 992) || (theme.dataNavLayout != "horizontal") && (theme.dataToggled != "icon-hover-closed" && theme.dataToggled != "menu-hover-closed")) {
			// {
			for (const item of menuItems) {
				if (item === targetObject) {
					if (theme.dataVerticalStyle == 'doublemenu' && item.active) { return; }
					item.active = !item.active;

					if (item.active) {
						closeOtherMenus(menuItems, item);
					} else {
						if (theme.dataVerticalStyle == 'doublemenu') {
							ThemeChanger({ ...theme, dataToggled: "double-menu-close" });
						}
					}
						setAncestorsActive(menuItems, item);

				}
				else if (!item.active) {
					if (theme.dataVerticalStyle != 'doublemenu') {
						item.active = false; // Set active to false for items not matching the target
					}
				}
				if (item.children && item.children.length > 0) {
					toggleSidemenu(event, targetObject, item.children);
				}
			}
			if (targetObject?.children && targetObject.active) {
				if (theme.dataVerticalStyle == 'doublemenu' && theme.dataToggled != 'double-menu-open') {
					ThemeChanger({ ...theme, dataToggled: "double-menu-open" });
				}
			}
			if (element && theme.dataNavLayout == 'horizontal' && (theme.dataNavStyle == 'menu-click' || theme.dataNavStyle == 'icon-click')) {
				const listItem = element.closest("li");
				if (listItem) {
					// Find the first sibling <ul> element
					const siblingUL = listItem.querySelector("ul");
					let outterUlWidth = 0;
					let listItemUL = listItem.closest('ul:not(.main-menu)');
					while (listItemUL) {
						listItemUL = listItemUL.parentElement.closest('ul:not(.main-menu)');
						if (listItemUL) {
							outterUlWidth += listItemUL.clientWidth;
						}
					}
					if (siblingUL) {
						// You've found the sibling <ul> element
						let siblingULRect = listItem.getBoundingClientRect();
						if (theme.dir == 'rtl') {
							if ((siblingULRect.left - siblingULRect.width - outterUlWidth + 150 < 0 && outterUlWidth < window.innerWidth) && (outterUlWidth + siblingULRect.width + siblingULRect.width < window.innerWidth)) {
								targetObject.dirchange = true;
							} else {
								targetObject.dirchange = false;
							}
						} else {
							if ((outterUlWidth + siblingULRect.right + siblingULRect.width + 50 > window.innerWidth && siblingULRect.right >= 0) && (outterUlWidth + siblingULRect.width + siblingULRect.width < window.innerWidth)) {
								targetObject.dirchange = true;
							} else {
								targetObject.dirchange = false;
							}
						}
					}
				}
			}
		}
		setMenuitems((arr: any) => [...arr]);
	}

	function setAncestorsActive(menuItems: any, targetObject: any) {
		const theme = store.getState();
		const parent = findParent(menuItems, targetObject);
		if (parent) {
			parent.active = true;
			if (parent.active) {
				ThemeChanger({ ...theme, dataToggled: "double-menu-open" });
			}

			setAncestorsActive(menuItems, parent);
		} else {
			if (theme.dataVerticalStyle == "doublemenu") {
				ThemeChanger({ ...theme, dataToggled: "double-menu-close" });
			}

		}
	}
	function closeOtherMenus(menuItems: any, targetObject: any) {
		for (const item of menuItems) {
			if (item !== targetObject) {
				item.active = false;
				if (item.children && item.children.length > 0) {
					closeOtherMenus(item.children, targetObject);
				}
			}
		}
	}
	function findParent(menuItems: any, targetObject: any) {
		for (const item of menuItems) {
			if (item.children && item.children.includes(targetObject)) {
				return item;
			}
			if (item.children && item.children.length > 0) {
				const parent: any = findParent(item.children, targetObject);
				if (parent) {
					return parent;
				}
			}
		}
		return null;
	}

	const Sideclick = () => {
		if (window.innerWidth > 992) {
			const	theme = store.getState()  
			if(theme.iconOverlay != "open"){
				ThemeChanger({ ...theme, iconOverlay: "open" });
			}
		}
	};

	function HoverToggleInnerMenuFn(event: any, item: any) {
		const theme = store.getState();
		let element = event.target;
		if (element && theme.dataNavLayout == "horizontal" && (theme.dataNavStyle == "menu-hover" || theme.dataNavStyle == "icon-hover")) {
			const listItem = element.closest("li");
			if (listItem) {
				// Find the first sibling <ul> element
				const siblingUL = listItem.querySelector("ul");
				let outterUlWidth = 0;
				let listItemUL = listItem.closest("ul:not(.main-menu)");
				while (listItemUL) {
					listItemUL = listItemUL.parentElement.closest("ul:not(.main-menu)");
					if (listItemUL) {
						outterUlWidth += listItemUL.clientWidth;
					}
				}
				if (siblingUL) {
					// You've found the sibling <ul> element
					let siblingULRect = listItem.getBoundingClientRect();
					if (theme.dir == "rtl") {
						if ((siblingULRect.left - siblingULRect.width - outterUlWidth + 150 < 0 && outterUlWidth < window.innerWidth) && (outterUlWidth + siblingULRect.width + siblingULRect.width < window.innerWidth)) {
							item.dirchange = true;
						} else {
							item.dirchange = false;
						}
					} else {
						if ((outterUlWidth + siblingULRect.right + siblingULRect.width + 50 > window.innerWidth && siblingULRect.right >= 0) && (outterUlWidth + siblingULRect.width + siblingULRect.width < window.innerWidth)) {
							item.dirchange = true;
						} else {
							item.dirchange = false;
						}
					}
				}
			}
		}
	}
	function handleAttributeChange(mutationsList: any) {
		for (const mutation of mutationsList) {
			if (mutation.type === 'attributes' && mutation.attributeName === 'data-nav-layout') {
				const newValue = mutation.target.getAttribute('data-nav-layout');
				if (newValue == 'vertical') {
					let currentPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
					currentPath = !currentPath ? '/dashboard/ecommerce' : currentPath;
					setMenuUsingUrl(currentPath);
				} else {
					closeMenu(true); // Keep selected menus open
				}
			}
		}
	}
	const handleClick = (event:any) => {
		// Your logic here
		event.preventDefault(); // Prevents the default anchor behavior (navigation)
		// ... other logic you want to perform on click
	};
	return (

		<Fragment>
			 
			<div id="responsive-overlay"
				onClick={(e) => { 
					// Don't close if clicking on menu items
					const target = e.target as HTMLElement;
					if (target.closest(".app-sidebar") || target.closest(".side-menu__item") || target.closest("a[href]")) {
						return;
					}
					menuClose(e.nativeEvent); 
				}}></div>
			<aside className="app-sidebar" id="sidebar" onMouseOver={() => Onhover()}
				onMouseLeave={() => Outhover()}>
				<div className="main-sidebar-header">
					<Link
						href="/dashboards/main"
						className="header-logo"
					>
						<span className="text-2xl font-bold text-white">Addon</span>
					</Link>
				</div>

				<SimpleBar className="main-sidebar " id="sidebar-scroll">
						<nav className="main-menu-container nav nav-pills flex-column sub-open">
							<div className="slide-left" id="slide-left" onClick={() => { slideLeft(); }}><svg xmlns="http://www.w3.org/2000/svg" fill="#7b8191" width="24"
								height="24" viewBox="0 0 24 24">
								<path d="M13.293 6.293 7.586 12l5.707 5.707 1.414-1.414L10.414 12l4.293-4.293z"></path>
							</svg></div>

							<ul className="main-menu" onClick={(e) => { e.stopPropagation(); Sideclick(); }}>
								{isLoading ? (
									// Loading skeleton
									<>
										<li className="slide">
											<div className="side-menu__item animate-pulse">
												<div className="w-4 h-4 bg-gray-300 rounded mr-3"></div>
												<div className="h-4 bg-gray-300 rounded w-20"></div>
											</div>
										</li>
										<li className="slide">
											<div className="side-menu__item animate-pulse">
												<div className="w-4 h-4 bg-gray-300 rounded mr-3"></div>
												<div className="h-4 bg-gray-300 rounded w-24"></div>
											</div>
										</li>
										<li className="slide">
											<div className="side-menu__item animate-pulse">
												<div className="w-4 h-4 bg-gray-300 rounded mr-3"></div>
												<div className="h-4 bg-gray-300 rounded w-16"></div>
											</div>
										</li>
									</>
								) : (
									menuitems.map((levelone: any, index:any) => (
										<Fragment key={index}>
											<li className={`${levelone.menutitle ? 'slide__category' : ''} ${levelone.type === 'link' ? 'slide' : ''}
	                                               ${levelone.type === 'sub' ? 'slide has-sub' : ''} ${levelone?.active ? 'open' : ''} ${levelone?.selected ? 'active' : ''}`}>
												{levelone.menutitle ?
													<span className='category-name'>
														{levelone.menutitle}
													</span>
													: ""}
												{levelone.type === "link" ?
													<Link href={levelone.path} className={`side-menu__item ${levelone.selected ? 'active' : ''}`} onClick={(e) => { 
														console.log('🟢 Top-level menu link clicked:', {
															path: levelone.path,
															title: levelone.title,
															currentSelected: levelone.selected,
															currentActive: levelone.active,
															windowWidth: window.innerWidth
														});
														e.stopPropagation(); 
														// Mark this item as selected
														levelone.selected = true;
														levelone.active = true;
														setMenuitems((arr: any) => [...arr]);
														console.log('✅ Set top-level menu item state:', {
															selected: levelone.selected,
															active: levelone.active
														});
														// Only close menu on mobile after navigation
														if (window.innerWidth <= 992) {
															console.log('📱 Mobile: Will close menu after navigation');
															setTimeout(() => {
																const theme = store.getState();
																ThemeChanger({ ...theme, dataToggled: "close" });
																const overlay = document.querySelector("#responsive-overlay");
																if (overlay) {
																	overlay.classList.remove("active");
																}
															}, 100);
														} else {
															console.log('🖥️ Desktop: Menu should stay open');
														}
													}} >
													<span className={`hs-tooltip inline-block [--placement:right] leading-none ${local_varaiable?.dataVerticalStyle == 'doublemenu' ? '' : 'hidden'}`}>
														<button type="button" className="hs-tooltip-toggle  inline-flex justify-center items-center
																">
															{levelone.icon}
															<span className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity inline-block absolute invisible z-10 py-1 px-2 bg-black text-xs font-medium text-white rounded shadow-sm dark:bg-neutral-700" role="tooltip">
																{levelone.title}
															</span>
														</button>
													</span>

													{local_varaiable.dataVerticalStyle != "doublemenu" ? levelone.icon :""}
													<span className="side-menu__label">{levelone.title} {levelone.badgetxt ? (<span className={levelone.class}> {levelone.badgetxt}</span>
														) : (
															""
														)}
														</span>
													</Link>
													: ""}
												{levelone.type === "empty" ?
													<Link href="#!" className='side-menu__item'
													 onClick={handleClick}
													>{levelone.icon}<span className=""> {levelone.title} {levelone.badgetxt ? (
														<span className={levelone.class}>{levelone.badgetxt} </span>
													) : (
														""
													)}
													</span>
													</Link>
													: ""}
												{levelone.type === "sub" ?
													<Menuloop MenuItems={levelone} level={level + 1} toggleSidemenu={toggleSidemenu} HoverToggleInnerMenuFn={HoverToggleInnerMenuFn} />
													: ''}
											</li>
										</Fragment>
									))
								)}
							</ul>

							<div className="slide-right" onClick={() => { slideRight(); }} id="slide-right">
								<svg xmlns="http://www.w3.org/2000/svg" fill="#7b8191" width="24" height="24" viewBox="0 0 24 24"><path d="M10.707 17.707 16.414 12l-5.707-5.707-1.414 1.414L13.586 12l-4.293 4.293z"></path></svg>
							</div>
						</nav>
				</SimpleBar>
			</aside>
		</Fragment>
	);
};

const mapStateToProps = (state: any) => ({
	local_varaiable: state
});

export default connect(mapStateToProps, { ThemeChanger })(Sidebar);
