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
        Cookies.remove('refreshToken');
        // Remove HTTP-only accessToken from server
        await fetch('/api/auth/logout', { method: 'POST' });
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
            await fetch('/api/auth/set-cookie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: data.tokens.access.token })
            });

            // Optionally keep refreshToken for client use
            Cookies.set('refreshToken', data.tokens.refresh.token, { expires: 7 });
            
            dispatch(authActions.loginSuccess(data.user));

            return data;
        } catch (error: any) {
            dispatch(authActions.loginFailure(error.message));
            throw error;
        }
    }
}; 