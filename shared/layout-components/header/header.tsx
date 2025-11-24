"use client"
import Link from 'next/link'
import React, { Fragment, useEffect, useState } from 'react';
import { ThemeChanger } from "../../redux/action";
import { connect, useDispatch } from 'react-redux';
import store from '@/shared/redux/store';
import Modalsearch from '../modal-search/modalsearch';
import { basePath } from '@/next.config';
import { useRouter } from 'next/navigation';
import { authActions } from '@/shared/redux/actions/authActions';

const Header = ({ local_varaiable, ThemeChanger }:any) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = local_varaiable?.auth?.user;

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async (e?: React.MouseEvent) => {
    if (loggingOut) return;
    if (e) e.preventDefault();
    setLoggingOut(true);
    await dispatch<any>(authActions.logout());
    setLoggingOut(false);
    router.push('/auth/login');
  };

  const [passwordshow1, setpasswordshow1] = useState(false);

  const data=  <span className="font-[600] py-[0.25rem] px-[0.45rem] rounded-[0.25rem] bg-pinkmain/10 text-pinkmain text-[0.625rem]">Free shipping</span>

  const cartProduct = [
    {
      id: 1,
      src: "/assets/images/ecommerce/jpg/1.jpg",
      name: 'SomeThing Phone',
      price: '$1,299.00',
      color: 'Metallic Blue',
      text: '6gb Ram',
      class: '',
    },
    {
      id: 2,
      src: "/assets/images/ecommerce/jpg/3.jpg",
      name: 'Stop Watch',
      price: '$179.29',
      color: 'Analog',
      text: data,
      class: '',
    },
    {
      id: 3,
      src: "/assets/images/ecommerce/jpg/5.jpg",
      name: 'Photo Frame',
      price: '$29.00',
      color: 'Decorative',
      text: '',
      class: '',
    },
    {
      id: 4,
      src: "/assets/images/ecommerce/jpg/4.jpg",
      name: 'Kikon Camera',
      price: '$4,999.00',
      color: 'Black',
      text: '50MM',
      class: '',
    },
    {
      id: 5,
      src: "/assets/images/ecommerce/jpg/6.jpg",
      name: 'Canvas Shoes',
      price: '$129.00',
      color: 'Gray',
      text: 'Sports',
      class: 'border-b-0',
    },
  ];

  const [cartItems, setCartItems] = useState([...cartProduct]);
  const [cartItemCount, setCartItemCount] = useState(cartProduct.length);
  const handleRemove = (itemId: number,event: { stopPropagation: () => void; }) => {
    event.stopPropagation();
    const updatedCart = cartItems.filter((item) => item.id !== itemId);
    setCartItems(updatedCart);
    setCartItemCount(updatedCart.length);
  };

  //Notifications

  const span1 = <span className="text-warning">ID: #1116773</span>
  const span2 = <span className="text-success">ID: 7731116</span>

 const span3 = <span className="font-[600] py-[0.25rem] px-[0.45rem] rounded-[0.25rem] bg-pinkmain/10 text-pinkmain text-[0.625rem]">Free shipping</span>

 const notifydata = [
  { id: 1, class: "Your Order Has Been Shipped", data: "Order No: 123456 Has Shipped To Your Delivery Address", icon: "gift", class2: "", color: "!bg-primary/10",color2: "primary"},
  { id: 2, class: "Discount Available", data: "Discount Available On Selected Products", icon: "discount-2", class2: "", color: "!bg-secondary/10",color2:"secondary" },
  { id: 3, class: "Account Has Been Verified", data: "Your Account Has Been Verified Sucessfully", icon: "user-check", class2: "", color: "!bg-pinkmain/10",color2: "pink"},
  { id: 4, class: "Order Placed", data: "Order Placed Successfully", icon: "circle-check", class2: span1, color: "!bg-warning/10",color2: "warning"},
  { id: 5, class: "Order Delayed", data: "Order Delayed Unfortunately", icon: "clock", class2: span2, color: "!bg-success/10",color2: "success"},
]

  const [notifications, setNotifications] = useState([...notifydata]);

  const handleNotificationClose = (index: number,event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (event) {
      event.stopPropagation();
    }
    const updatedNotifications = [...notifications];
    updatedNotifications.splice(index, 1);
    setNotifications(updatedNotifications);
  };

  //full screen
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const fullscreenChangeHandler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", fullscreenChangeHandler);

    return () => {
      document.removeEventListener("fullscreenchange", fullscreenChangeHandler);
    };
  }, []);


  useEffect(() => {
    const handleResize = () => {
      const windowObject = window;
      if (windowObject.innerWidth <= 991) {
        // Mobile - overlay can be active
      } else {
        // Desktop - remove overlay if it exists
        const overlay = document.querySelector("#responsive-overlay");
        if (overlay) {
          overlay.classList.remove("active");
        }
      }
    };
    handleResize(); // Check on component mount
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Sync Redux state with DOM attributes
  useEffect(() => {
    console.log('Header: Redux state changed, syncing with DOM');
    console.log('Current local_varaiable:', local_varaiable);
    
    // Update DOM attributes based on Redux state
    if (local_varaiable.dataToggled !== undefined) {
      document.documentElement.setAttribute('data-toggled', local_varaiable.dataToggled);
    }
    if (local_varaiable.iconOverlay !== undefined) {
      document.documentElement.setAttribute('data-icon-overlay', local_varaiable.iconOverlay);
    }
    
    // Ensure overlay is only active on mobile
    const overlay = document.querySelector("#responsive-overlay");
    if (overlay) {
      if (window.innerWidth >= 992) {
        overlay.classList.remove("active");
      }
    }
  }, [local_varaiable.dataToggled, local_varaiable.iconOverlay]);


  function menuClose() {
    const theme = store.getState();
    if (window.innerWidth <= 992) {
      ThemeChanger({ ...theme, dataToggled: "close" });
    }
    if (window.innerWidth >= 992) {
      ThemeChanger({ ...theme, dataToggled: local_varaiable.dataToggled ? local_varaiable.dataToggled : '' });
    }
  }

  const toggleSidebar = () => { 
    console.log('Toggle sidebar clicked');
    const theme = store.getState();
    console.log('Current theme state:', theme);
    
    const isMobile = window.innerWidth < 992;
    console.log('Is mobile:', isMobile);
    
    if (isMobile) {
      // Mobile behavior - simple toggle between open and close
      console.log('Mobile toggle - current dataToggled:', theme.dataToggled);
      
      if (theme.dataToggled === "close" || theme.dataToggled === "") {
        console.log('Opening sidebar on mobile');
        const newState = { ...theme, "dataToggled": "open" };
        ThemeChanger(newState);
        
        // Force DOM update
        setTimeout(() => {
          document.documentElement.setAttribute('data-toggled', 'open');
        }, 0);

        setTimeout(() => {
          const overlay = document.querySelector("#responsive-overlay");
          if (overlay) {
            overlay.classList.add("active");
            // Remove existing event listeners to prevent duplicates
            const newOverlay = overlay.cloneNode(true);
            overlay.parentNode?.replaceChild(newOverlay, overlay);
            
            // Add new event listener
            newOverlay.addEventListener("click", () => {
              const overlay = document.querySelector("#responsive-overlay");
              if (overlay) {
                overlay.classList.remove("active");
                menuClose();
              }
            });
          }

          window.addEventListener("resize", () => {
            if (window.innerWidth >= 992) {
              const overlay = document.querySelector("#responsive-overlay");
              if (overlay) {
                overlay.classList.remove("active");
              }
            }
          });
        }, 100);
      } else {
        console.log('Closing sidebar on mobile');
        const newState = { ...theme, "dataToggled": "close" };
        ThemeChanger(newState);
        
        // Force DOM update
        setTimeout(() => {
          document.documentElement.setAttribute('data-toggled', 'close');
        }, 0);
        
        // Remove overlay if it exists
        const overlay = document.querySelector("#responsive-overlay");
        if (overlay) {
          overlay.classList.remove("active");
        }
      }
    } else {
      // Desktop behavior
      console.log('Desktop toggle - verticalStyle:', theme.dataVerticalStyle, 'dataToggled:', theme.dataToggled);
      
      let newToggledState = "";
      let newIconOverlay = "";
      
      if (theme.dataVerticalStyle === "overlay") {
        if (theme.dataToggled === "icon-overlay-close") {
          console.log('Opening overlay sidebar');
          newToggledState = "";
          newIconOverlay = "";
        } else {
          console.log('Closing overlay sidebar');
          newToggledState = "icon-overlay-close";
          newIconOverlay = "";
        }
      } else if (theme.dataVerticalStyle === "closed") {
        if (theme.dataToggled === "close-menu-close") {
          console.log('Opening closed sidebar');
          newToggledState = "";
        } else {
          console.log('Closing closed sidebar');
          newToggledState = "close-menu-close";
        }
      } else if (theme.dataVerticalStyle === "icontext") {
        if (theme.dataToggled === "icon-text-close") {
          console.log('Opening icontext sidebar');
          newToggledState = "";
        } else {
          console.log('Closing icontext sidebar');
          newToggledState = "icon-text-close";
        }
      } else if (theme.dataVerticalStyle === "detached") {
        if (theme.dataToggled === "detached-close") {
          console.log('Opening detached sidebar');
          newToggledState = "";
          newIconOverlay = "";
        } else {
          console.log('Closing detached sidebar');
          newToggledState = "detached-close";
          newIconOverlay = "";
        }
      } else {
        // Default behavior - just toggle
        console.log('Default toggle behavior');
        newToggledState = theme.dataToggled === "" ? "close" : "";
      }
      
      const newState = { ...theme, "dataToggled": newToggledState, "iconOverlay": newIconOverlay };
      ThemeChanger(newState);
      
      // Force DOM update
      setTimeout(() => {
        document.documentElement.setAttribute('data-toggled', newToggledState);
        if (newIconOverlay !== undefined) {
          document.documentElement.setAttribute('data-icon-overlay', newIconOverlay);
        }
        console.log('DOM updated with data-toggled:', newToggledState);
      }, 0);
    }
  };
  //Dark Model

  const ToggleDark = () => {

    ThemeChanger({
      ...local_varaiable,
      "class": local_varaiable.class == 'dark' ? 'light' : 'dark',
      "dataHeaderStyles":local_varaiable.class == 'dark' ? 'light' : 'dark',
      "dataMenuStyles": local_varaiable.dataNavLayout == 'horizontal' ? local_varaiable.class == 'dark' ? 'light' : 'dark' : "dark"

    });
    const theme = store.getState();

    if (theme.class != 'dark') {

      ThemeChanger({
        ...theme,
        "bodyBg": '',
        "Light": '',
        "darkBg": '',
        "inputBorder": '',
      });
      localStorage.setItem("ynexlighttheme", "light");
      localStorage.removeItem("ynexdarktheme");
      localStorage.removeItem("ynexMenu");
      localStorage.removeItem("ynexHeader");
    }
    else {
      localStorage.setItem("ynexdarktheme", "dark");
      localStorage.removeItem("ynexlighttheme");
      localStorage.removeItem("ynexMenu");
      localStorage.removeItem("ynexHeader");
    }

  };


  useEffect(() => {
    const navbar = document?.querySelector(".header");
    const navbar1 = document?.querySelector(".app-sidebar");
    const sticky:any = navbar?.clientHeight;
    // const sticky1 = navbar1.clientHeight;

    function stickyFn() {
      if (window.pageYOffset >= sticky) {
        navbar?.classList.add("sticky-pin");
        navbar1?.classList.add("sticky-pin");
      } else {
        navbar?.classList.remove("sticky-pin");
        navbar1?.classList.remove("sticky-pin");
      }
    }

    window.addEventListener("scroll", stickyFn);
    window.addEventListener("DOMContentLoaded", stickyFn);

    // Cleanup event listeners when the component unmounts
    return () => {
      window.removeEventListener("scroll", stickyFn);
      window.removeEventListener("DOMContentLoaded", stickyFn);
    };
  }, []);

  return (
    <Fragment>
      <div className="app-header">
        <nav className="main-header !h-[3.75rem]" aria-label="Global">
          <div className="main-header-container ps-[0.725rem] pe-[1rem] ">

            <div className="header-content-left">
              <div className="header-element">
                <div className="horizontal-logo">
                  <Link href="/dashboards/main" className="header-logo">
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/brand-logos/desktop-logo.png`} alt="logo" className="desktop-logo" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/brand-logos/toggle-logo.png`} alt="logo" className="toggle-logo" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/brand-logos/desktop-dark.png`} alt="logo" className="desktop-dark" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/brand-logos/toggle-dark.png`} alt="logo" className="toggle-dark" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/brand-logos/desktop-white.png`} alt="logo" className="desktop-white" />
                    <img src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/brand-logos/toggle-white.png`} alt="logo" className="toggle-white" />
                  </Link>
                </div>
              </div>
              <div className="header-element md:px-[0.325rem] !items-center">
                <button 
                  aria-label="Toggle Sidebar"
                  className="sidemenu-toggle animated-arrow hor-toggle horizontal-navtoggle inline-flex items-center"
                  onClick={() => toggleSidebar()}
                  type="button"
                >
                  <span></span>
                </button>
              </div>
            </div>
            <div className="header-content-right">

            
              <div className="header-element header-fullscreen py-[1rem] md:px-[0.65rem] px-2">
              <button
                  aria-label="anchor"
                  onClick={() => toggleFullscreen()}
                  className="inline-flex flex-shrink-0 justify-center items-center gap-2  !rounded-full font-medium dark:hover:bg-black/20 dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white dark:focus:ring-white/10 dark:focus:ring-offset-white/10"
                >
                  {isFullscreen ? (
                    <i className="bx bx-exit-fullscreen full-screen-close header-link-icon"></i>
                  ) : (
                    <i className="bx bx-fullscreen full-screen-open header-link-icon"></i>
                  )}
                </button>
              </div>
              <div className="header-element md:!px-[0.65rem] px-2 hs-dropdown !items-center ti-dropdown [--placement:bottom-left]">

                <button id="dropdown-profile" type="button"
                  className="hs-dropdown-toggle ti-dropdown-toggle !gap-2 !p-0 flex-shrink-0 sm:me-2 me-0 !rounded-full !shadow-none text-xs align-middle !border-0 !shadow-transparent ">
                  <img className="inline-block rounded-full " src={`${process.env.NODE_ENV === "production" ? basePath : ""}/assets/images/faces/9.jpg`} width="32" height="32" alt="Image Description" />
                </button>
                <div className="md:block hidden dropdown-profile">
                  <p className="font-semibold mb-0 leading-none text-[#536485] text-[0.813rem] ">{user?.name || user?.username || 'Admin'}</p>

                </div>
                <div
                  className="hs-dropdown-menu ti-dropdown-menu !-mt-3 border-0 w-[11rem] !p-0 border-defaultborder hidden main-header-dropdown  pt-0 overflow-hidden header-profile-dropdown dropdown-menu-end"
                  aria-labelledby="dropdown-profile">

                  <ul className="text-defaulttextcolor font-medium dark:text-[#8c9097] dark:text-white/50">
                    <li><Link onClick={handleLogout} className="w-full ti-dropdown-item !text-[0.8125rem] !p-[0.65rem] !gap-x-0 !inline-flex cursor-pointer" 
                      href="#!"
                    ><i
                      className="ti ti-logout text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>{loggingOut ? 'Logging out...' : 'Logout'}</Link></li>
                  </ul>
                </div>
              </div>
             
            </div>
          </div>
        </nav>
      </div>
      <Modalsearch />
    </Fragment>
  )
}

const mapStateToProps = (state:any) => ({
  local_varaiable: state
});
export default connect(mapStateToProps, { ThemeChanger })(Header);