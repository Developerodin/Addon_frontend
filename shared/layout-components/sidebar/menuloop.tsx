import { ThemeChanger } from "@/shared/redux/action";
import Link from "next/link";
import { Fragment } from "react";
import { connect } from "react-redux";
import store from "@/shared/redux/store";

function Menuloop({ local_varaiable ,MenuItems, toggleSidemenu, level , HoverToggleInnerMenuFn, setMenuitems}: any) {

  const handleClick = (event:any) => {
		// Your logic here
		event.preventDefault(); // Prevents the default anchor behavior (navigation)
		// ... other logic you want to perform on click
	};
  
  return (
    <Fragment>
      <Link href="#!" scroll={false} className={`side-menu__item ${MenuItems?.selected ? "active" : ""}`}
        onClick={(event) => { 
          console.log('🔵 PARENT MENU CLICKED:', {
            title: MenuItems?.title,
            currentActive: MenuItems?.active,
            currentSelected: MenuItems?.selected,
            hasChildren: !!MenuItems?.children,
            childrenCount: MenuItems?.children?.length,
            hasSelectedChild: MenuItems?.children?.some((c: any) => c.selected || c.active)
          });
          // Don't toggle if clicking on a child link - let the child link handle it
          const target = event.target as HTMLElement;
          // Check if the click originated from within the child menu
          const childMenu = target.closest('ul.slide-menu');
          const clickedLink = target.closest('a[href]');
          // If clicking on a child link (has real href and is in child menu), don't toggle parent
          const isChildLink = childMenu && clickedLink && clickedLink.getAttribute('href') !== '#!';
          console.log('🔵 Parent menu click detection:', {
            isChildLink,
            childMenu: !!childMenu,
            clickedLink: !!clickedLink,
            href: clickedLink?.getAttribute('href'),
            targetTag: target.tagName,
            targetClass: target.className
          });
          if (!isChildLink) {
            console.log('🔵 Calling toggleSidemenu for parent:', MenuItems?.title);
            event.preventDefault(); 
            toggleSidemenu(event, MenuItems);
          } else {
            console.log('🔵 Skipping toggle - child link clicked');
          }
        }} onMouseEnter={ (event) =>HoverToggleInnerMenuFn(event, MenuItems)}>

          <span className={`hs-tooltip inline-block [--placement:right] leading-none ${local_varaiable?.dataVerticalStyle == 'doublemenu' ? '' : 'hidden'}`}>
              <button type="button" className="hs-tooltip-toggle  inline-flex justify-center items-center">
                {MenuItems.icon}
                <span className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity inline-block absolute invisible z-10 py-1 px-2 bg-black text-xs font-medium text-white rounded shadow-sm dark:bg-neutral-700" role="tooltip">
                  {MenuItems.title}
                </span>
              </button>
         </span>
         {local_varaiable?.dataVerticalStyle != "doublemenu" ? MenuItems.icon :""}
            
          <span className={`${level == 1 ? "side-menu__label" : ""}`}> {MenuItems.title} {MenuItems.badgetxt ? (<span className={MenuItems.class}> {MenuItems.badgetxt} </span>
        ) : (
          ""
        )}
        </span>
        <i className="fe fe-chevron-right side-menu__angle"></i>
      </Link>
      <ul className={`slide-menu child${level}  ${MenuItems.active ? 'double-menu-active' : ''} ${MenuItems?.dirchange ? "force-left" : ""} `} style={MenuItems.active ? { display: "block" } : { display: "none" }} onClick={(e) => { e.stopPropagation(); }}>
        {level <= 1 ? <li className="slide side-menu__label1">
          <Link href="#!" scroll={false}>{MenuItems.title}</Link>
        </li> : ""}
        {MenuItems.children.map((firstlevel: any, index:any) =>
          <li className={`${firstlevel.menutitle ? 'slide__category' : ''} ${firstlevel?.type == 'empty' ? 'slide' : ''} ${firstlevel?.type == 'link' ? 'slide' : ''} ${firstlevel?.type == 'sub' ? 'slide has-sub' : ''} ${firstlevel?.active ? 'open' : ''} ${firstlevel?.selected ? 'active' : ''}`} key={index}>
            {firstlevel.type === "link" ?
              <Link href={firstlevel.path} className={`side-menu__item ${firstlevel.selected ? 'active' : ''}`} onClick={(e) => { 
                console.log('🟢 ========== CHILD LINK CLICKED ==========');
                console.log('🟢 Child link clicked:', {
                  path: firstlevel.path,
                  title: firstlevel.title,
                  currentSelected: firstlevel.selected,
                  currentActive: firstlevel.active,
                  parentTitle: MenuItems?.title,
                  parentActive: MenuItems?.active,
                  parentSelected: MenuItems?.selected,
                  windowWidth: window.innerWidth
                });
                e.stopPropagation(); 
                console.log('🟢 BEFORE STATE UPDATE - Parent state:', {
                  active: MenuItems?.active,
                  selected: MenuItems?.selected
                });
                // Mark this item as selected and keep parent menu open
                firstlevel.selected = true;
                firstlevel.active = true;
                if (MenuItems) {
                  // Ensure parent menu stays open when child link is clicked
                  const oldActive = MenuItems.active;
                  const oldSelected = MenuItems.selected;
                  MenuItems.active = true;
                  MenuItems.selected = true;
                  console.log('✅ Set parent menu active:', {
                    title: MenuItems.title,
                    oldActive,
                    newActive: MenuItems.active,
                    oldSelected,
                    newSelected: MenuItems.selected
                  });
                }
                // Trigger state update to ensure React re-renders with the new state
                if (setMenuitems) {
                  console.log('🟢 Calling setMenuitems to trigger re-render');
                  setMenuitems((arr: any) => [...arr]);
                } else {
                  console.log('❌ setMenuitems is not available!');
                }
                console.log('✅ AFTER STATE UPDATE - Menu item state:', {
                  selected: firstlevel.selected,
                  active: firstlevel.active,
                  parentActive: MenuItems?.active,
                  parentSelected: MenuItems?.selected
                });
                console.log('🟢 =========================================');
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
              }}>{firstlevel.icon}
                <span className=""> {firstlevel.title} {firstlevel.badgetxt ? (<span className={firstlevel.class}> {firstlevel.badgetxt}</span>
                ) : (
                  ""
                )}
                </span>
              </Link>
              : ""}
            {firstlevel.type === "empty" ?
              <Link href="#!" className='side-menu__item' onClick={handleClick}> {firstlevel.icon}<span className=""> {firstlevel.title} {firstlevel.badgetxt ? (<span className={firstlevel.class}> {firstlevel.badgetxt} </span>
              ) : (
                ""
              )}
              </span>
              </Link>
              : ""}
            {firstlevel.type === "sub" ?
              <Menuloop MenuItems={firstlevel} toggleSidemenu={toggleSidemenu} HoverToggleInnerMenuFn={HoverToggleInnerMenuFn} level={level + 1} setMenuitems={setMenuitems} />
              : ''}

          </li>
        )}

      </ul>
    </Fragment>
  );
}

const mapStateToProps = (state: any) => ({
	local_varaiable: state
});

export default connect(mapStateToProps, { ThemeChanger })(Menuloop);
