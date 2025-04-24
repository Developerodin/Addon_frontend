"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: any) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/catalog/items');
    } else {
      router.push('/auth/login');
    }
  }, [router, isAuthenticated]);

  return null;
}
