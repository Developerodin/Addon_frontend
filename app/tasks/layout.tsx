'use client';

import ContentLayout from '@/app/(components)/(contentlayout)/layout';
import './tasks.css';

/**
 * App shell for the tasks screen.
 */
export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <ContentLayout>{children}</ContentLayout>;
}
