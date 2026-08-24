import { redirect } from 'next/navigation';

/**
 * Production dashboard - redirects to command dashboard
 */
export default function ProductionDashboardPage() {
  redirect('/production/command');
}
