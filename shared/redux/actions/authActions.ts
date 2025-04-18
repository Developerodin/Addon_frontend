import { AUTH_TYPES } from '../types/authTypes';
import Cookies from 'js-cookie';

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

    logout: () => ({
        type: AUTH_TYPES.LOGOUT
    }),

    login: (email: string, password: string) => async (dispatch: any) => {
        try {
            dispatch(authActions.loginRequest());

            const response = await fetch('http://localhost:3001/v1/auth/login', {
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

            Cookies.set('accessToken', data.tokens.access.token, { expires: 7 });
            Cookies.set('refreshToken', data.tokens.refresh.token, { expires: 7 });
            
            dispatch(authActions.loginSuccess(data.user));

            return data;
        } catch (error: any) {
            dispatch(authActions.loginFailure(error.message));
            throw error;
        }
    }
}; 