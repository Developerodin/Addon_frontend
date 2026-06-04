"use client"
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import Cookies from 'js-cookie';
import { isAccessTokenValid } from '@/shared/utils/authToken';
import { authActions } from '@/shared/redux/actions/authActions';

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Sends the browser to login and clears any stale session cookies.
 */
function redirectToLogin(): void {
  Cookies.remove('accessToken', { path: '/' });
  Cookies.remove('refreshToken', { path: '/' });
  window.location.replace('/auth/login');
}

/**
 * Guards authenticated app chrome and page content; redirects when session is missing or invalid.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, authInitialized } = useSelector((state: any) => state.auth);
  const accessToken = Cookies.get('accessToken');
  const hasValidToken = isAccessTokenValid(accessToken);
  const hasValidSession = isAuthenticated && hasValidToken;
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (redirecting) {
      return;
    }

    if (!hasValidToken) {
      setRedirecting(true);
      void dispatch(authActions.sessionExpired());
      redirectToLogin();
      return;
    }

    if (!authInitialized) {
      return;
    }

    if (!hasValidSession) {
      setRedirecting(true);
      void dispatch(authActions.sessionExpired());
      redirectToLogin();
    }
  }, [
    authInitialized,
    dispatch,
    hasValidSession,
    hasValidToken,
    redirecting,
    router,
  ]);

  if (redirecting || !hasValidToken) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Redirecting to login"
      >
        <p className="text-sm text-gray-500">Redirecting to login…</p>
      </div>
    );
  }

  if (!authInitialized) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Checking authentication"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Redirecting to login"
      >
        <p className="text-sm text-gray-500">Redirecting to login…</p>
      </div>
    );
  }

  return <>{children}</>;
}
