"use client"
import PrelineScript from "@/app/PrelineScript"
import Footer from "@/shared/layout-components/footer/footer"
import Header from "@/shared/layout-components/header/header"
import Sidebar from "@/shared/layout-components/sidebar/sidebar"
import Switcher from "@/shared/layout-components/switcher/switcher"
import { ThemeChanger } from "@/shared/redux/action"
import store from "@/shared/redux/store"
import { Fragment, Suspense, useState } from "react"
import { connect } from "react-redux"
import { NavigationProvider } from "@/shared/contextapi/navigationContext"
import { RequireAuth } from "@/shared/components/auth/RequireAuth"

const Layout = ({ children, }: any) => {

  const [MyclassName, setMyClass] = useState("");

  const Bodyclickk = () => {
    const theme = store.getState();
    if (localStorage.getItem("ynexverticalstyles") == "icontext") {
      setMyClass("");
    }
    if (window.innerWidth > 992) {
      if (theme.iconOverlay === 'open') {
        ThemeChanger({ ...theme, iconOverlay: "" });
      }
    }
  }

  return (
    <>


      <Fragment>
        <RequireAuth>
          <Switcher />
          <div className='page'>
            <NavigationProvider>
              <Header />
              <Suspense
                fallback={
                  <aside
                    className="app-sidebar"
                    id="sidebar"
                    aria-busy="true"
                    aria-label="Loading navigation"
                  >
                    <div className="main-sidebar-header" />
                    <div className="main-sidebar min-h-[200px]" />
                  </aside>
                }
              >
                <Sidebar />
              </Suspense>
              <div className='content'>
                <div
                  className='main-content'
                  style={{ paddingLeft: 0, paddingRight: 0 }}
                  onClick={Bodyclickk}
                >
                  {children}
                </div>
              </div>
            </NavigationProvider>
            <Footer />
          </div>
          <PrelineScript />
        </RequireAuth>
      </Fragment>
    </>
  )
}

const mapStateToProps = (state: any) => ({
  local_varaiable: state
});

export default connect(mapStateToProps, { ThemeChanger })(Layout);
