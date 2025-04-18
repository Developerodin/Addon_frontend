import { AUTH_TYPES } from '../types/authTypes';
import Cookies from 'js-cookie';

const initialState = {
    user: null,
    loading: false,
    error: null,
    isAuthenticated: false
};

export const authReducer = (state = initialState, action: any) => {
    switch (action.type) {
        case AUTH_TYPES.LOGIN_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };

        case AUTH_TYPES.LOGIN_SUCCESS:
            return {
                ...state,
                loading: false,
                user: action.payload,
                isAuthenticated: true,
                error: null
            };

        case AUTH_TYPES.LOGIN_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload,
                isAuthenticated: false
            };

        case AUTH_TYPES.LOGOUT:
            Cookies.remove('accessToken');
            Cookies.remove('refreshToken');
            localStorage.removeItem('user');
            localStorage.removeItem('auth');
            return {
                ...initialState,
                isAuthenticated: false
            };

        default:
            return state;
    }
}; 