import { redirect } from 'next/navigation';

/**
 * Production root page - redirects to command dashboard
 */
export default function ProductionPage() {
  redirect('/production/command');
}
