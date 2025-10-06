"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import { useNavigation } from '@/shared/contextapi/navigationContext'
import { getFirstAvailableRoute } from '@/shared/utils/routeUtils'

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: any) => state.auth);
  const { permissions } = useNavigation();

  useEffect(() => {
    if (isAuthenticated && permissions) {
      const firstAvailableRoute = getFirstAvailableRoute(permissions);
      console.log('Root route redirecting to first available route:', firstAvailableRoute);
      router.push(firstAvailableRoute);
    } else if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [router, isAuthenticated, permissions]);

  return null;
}
