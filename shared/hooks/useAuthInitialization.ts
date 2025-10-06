"use client"
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authActions } from '@/shared/redux/actions/authActions';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export const useAuthInitialization = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading } = useSelector((state: any) => state.auth);

  useEffect(() => {
    const initializeAuth = async () => {
      // Check if user is already loaded
      if (user || loading) {
        return;
      }

      // Check if we have tokens
      const accessToken = Cookies.get('accessToken');
      const refreshToken = Cookies.get('refreshToken');

      if (!accessToken && !refreshToken) {
        console.log('No tokens found, user not authenticated');
        return;
      }

      try {
        console.log('Initializing auth with existing tokens...');
        console.log('Access token:', accessToken ? 'Present' : 'Missing');
        
        // Call the backend API directly
        const apiUrl = `${API_BASE_URL}/users/me`;
        console.log('Calling backend API:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Backend response status:', response.status);
        console.log('Backend response ok:', response.ok);

        if (response.ok) {
          const userData = await response.json();
          console.log('Loaded user data on initialization:', userData);
          console.log('User navigation permissions:', userData.navigation);
          
          // Dispatch login success to update Redux store
          dispatch(authActions.loginSuccess(userData));
        } else if (response.status === 401) {
          console.log('Token expired or invalid, clearing tokens');
          // Clear invalid tokens
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
        } else {
          const errorText = await response.text();
          console.log('Failed to load user data, status:', response.status);
          console.log('Error response:', errorText);
          // Don't clear tokens for other errors, might be temporary
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Don't clear tokens on network errors, might be temporary
      }
    };

    initializeAuth();
  }, [dispatch, user, loading]);

  return { user, isAuthenticated, loading };
};
