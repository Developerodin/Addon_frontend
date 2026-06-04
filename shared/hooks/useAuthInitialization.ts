"use client"
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authActions } from '@/shared/redux/actions/authActions';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { isAccessTokenExpired, isAccessTokenValid } from '@/shared/utils/authToken';
import Cookies from 'js-cookie';

/**
 * Validates stored tokens once on app startup and syncs Redux with the backend.
 */
export const useAuthInitialization = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, authInitialized } = useSelector((state: any) => state.auth);

  useEffect(() => {
    if (authInitialized) {
      return;
    }

    let cancelled = false;

    const initializeAuth = async () => {
      const accessToken = Cookies.get('accessToken');
      const refreshToken = Cookies.get('refreshToken');

      const markInitialized = () => {
        if (!cancelled) {
          dispatch(authActions.authInitialized());
        }
      };

      const clearSession = () => {
        void dispatch(authActions.sessionExpired());
      };

      try {
        if (!accessToken && !refreshToken) {
          if (user || isAuthenticated) {
            clearSession();
          }
          return;
        }

        if (!accessToken || isAccessTokenExpired(accessToken)) {
          clearSession();
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(`${API_BASE_URL}/users/me`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          if (response.ok) {
            const userData = await response.json();
            dispatch(authActions.loginSuccess(userData));
          } else {
            clearSession();
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          clearSession();
        } finally {
          clearTimeout(timeoutId);
        }
      } finally {
        markInitialized();
      }
    };

    void initializeAuth();

    return () => {
      cancelled = true;
    };
  }, [dispatch, authInitialized, user, isAuthenticated]);

  return useSelector((state: any) => state.auth);
};
