"use client"
import React, { ReactNode } from 'react';
import { useAuthInitialization } from '@/shared/hooks/useAuthInitialization';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize authentication when the app starts
  useAuthInitialization();

  return <>{children}</>;
};
