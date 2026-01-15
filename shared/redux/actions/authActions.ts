import { AUTH_TYPES } from '../types/authTypes';
import Cookies from 'js-cookie';
import { API_BASE_URL } from '@/shared/data/utilities/api';

export const authActions = {
    loginRequest: () => ({
        type: AUTH_TYPES.LOGIN_REQUEST
    }),

    loginSuccess: (userData: any) => ({
        type: AUTH_TYPES.LOGIN_SUCCESS,
        payload: userData
    }),

    loginFailure: (error: string) => ({
        type: AUTH_TYPES.LOGIN_FAILURE,
        payload: error
    }),

    logout: () => async (dispatch: any) => {
        // Remove refreshToken from client
        Cookies.remove('refreshToken', { path: '/' });
        // Remove accessToken from server
        await fetch('/api/auth/logout', { 
            method: 'POST',
            credentials: 'include' // Ensure cookies are sent
        });
        dispatch({ type: AUTH_TYPES.LOGOUT });
    },

    login: (email: string, password: string) => async (dispatch: any) => {
        try {
            dispatch(authActions.loginRequest());

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Set accessToken as HTTP-only cookie via API route
            const cookieResponse = await fetch('/api/auth/set-cookie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: data.tokens.access.token }),
                credentials: 'include' // Ensure cookies are sent/received
            });

            if (!cookieResponse.ok) {
                console.error('Failed to set access token cookie');
            }

            // Optionally keep refreshToken for client use
            // Don't set domain to work with both localhost and IP addresses
            Cookies.set('refreshToken', data.tokens.refresh.token, { 
                expires: 7,
                path: '/',
                sameSite: 'lax'
            });
            
            // Verify cookie was set (for debugging)
            const verifyToken = Cookies.get('accessToken');
            if (!verifyToken) {
                console.warn('Access token cookie not immediately available, may need page refresh');
            }
            
            dispatch(authActions.loginSuccess(data.user));

            return data;
        } catch (error: any) {
            dispatch(authActions.loginFailure(error.message));
            throw error;
        }
    }
}; 