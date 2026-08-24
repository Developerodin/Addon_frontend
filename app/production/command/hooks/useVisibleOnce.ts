"use client";

import { useState, useEffect, useRef, RefObject, useCallback } from 'react';

interface UseVisibleOnceOptions {
  threshold?: number;
  rootMargin?: string;
  initialVisible?: boolean;
}

/**
 * Hook to detect when an element becomes visible once
 * Uses IntersectionObserver for lazy loading dashboard sections
 */
export function useVisibleOnce<T extends HTMLElement = HTMLDivElement>(
  options: UseVisibleOnceOptions = {}
): [RefObject<T | null>, boolean] {
  const { threshold = 0.1, rootMargin = '200px', initialVisible = false } = options;
  
  const ref = useRef<T | null>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(initialVisible);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  // Set up observer
  useEffect(() => {
    if (hasBeenVisible) return;
    
    // Use setTimeout to ensure ref is set after render
    const timeoutId = setTimeout(() => {
      if (!ref.current || hasBeenVisible) return;
      
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setHasBeenVisible(true);
            observerRef.current?.disconnect();
          }
        },
        { threshold, rootMargin }
      );
      
      observerRef.current.observe(ref.current);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      observerRef.current?.disconnect();
    };
  }, [hasBeenVisible, threshold, rootMargin]);
  
  // Re-check visibility when ref changes (for dynamic content)
  const setRef = useCallback((node: T | null) => {
    if (ref.current === node) return;
    
    // Disconnect previous observer
    observerRef.current?.disconnect();
    
    ref.current = node;
    
    if (node && !hasBeenVisible) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setHasBeenVisible(true);
            observerRef.current?.disconnect();
          }
        },
        { threshold, rootMargin }
      );
      observerRef.current.observe(node);
    }
  }, [hasBeenVisible, threshold, rootMargin]);
  
  // Return a ref object that uses the callback
  const callbackRef = useRef<T | null>(null);
  
  return [ref, hasBeenVisible];
}

export default useVisibleOnce;
