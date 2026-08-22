/**
 * Plain action — NOT an async thunk. The async wrapper is dropped by SWC
 * minify in production, so sidebar toggle appeared to do nothing after build.
 */
export const ThemeChanger = (value: any) => ({
  type: "ThemeChanger",
  payload: value,
});
  export const AddToCart = (id: string) => async (dispatch: (arg0: { type: string; payload: string; }) => void) => {
    dispatch({
      type: "ADD_TO_CART",
      payload: id
    });
  };
  export const ProductReduxData = (id:any) => async (dispatch: (arg0: { type: string; payload:any; }) => void) => {
    dispatch({
        type: "PRODUCT",
        payload: id
    });
  };


