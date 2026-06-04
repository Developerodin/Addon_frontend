"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import { useNavigation } from '@/shared/contextapi/navigationContext'
import { getFirstAvailableRoute } from '@/shared/utils/routeUtils'
import Cookies from 'js-cookie'
import { isAccessTokenValid } from '@/shared/utils/authToken'

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, authInitialized } = useSelector((state: any) => state.auth);
  const { permissions } = useNavigation();
  const accessToken = Cookies.get('accessToken');
  const hasValidToken = isAccessTokenValid(accessToken);

  useEffect(() => {
    if (!hasValidToken) {
      router.replace('/auth/login');
      return;
    }

    if (!authInitialized) {
      return;
    }

    if (isAuthenticated && permissions) {
      router.replace(getFirstAvailableRoute(permissions));
      return;
    }

    router.replace('/auth/login');
  }, [router, authInitialized, isAuthenticated, permissions, hasValidToken]);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
    </div>
  );
}
