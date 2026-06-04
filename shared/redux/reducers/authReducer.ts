import { AUTH_TYPES } from '../types/authTypes';
import Cookies from 'js-cookie';

const initialState = {
    user: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    authInitialized: false,
};

/** Clears cached navigation permissions from localStorage after logout. */
function clearNavigationCache(): void {
    if (typeof window === 'undefined') {
        return;
    }
    localStorage.removeItem('navigationPermissions');
    localStorage.removeItem('cachedUserId');
}

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
                error: null,
                authInitialized: true,
            };

        case AUTH_TYPES.LOGIN_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload,
                isAuthenticated: false,
                authInitialized: true,
            };

        case AUTH_TYPES.LOGOUT:
            Cookies.remove('accessToken');
            Cookies.remove('refreshToken');
            clearNavigationCache();
            return { ...initialState, authInitialized: true };

        case AUTH_TYPES.AUTH_INITIALIZED:
            return {
                ...state,
                authInitialized: true,
            };

        default:
            return state;
    }
}; 