"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Seo from '@/shared/layout-components/seo/seo';
import { useNavigation } from '@/shared/contextapi/navigationContext';
import poReturnChallanService, { PoReturnChallan } from '@/shared/services/poReturnChallanService';
import ChallanDetailDrawer from '@/shared/components/po-return-challan/ChallanDetailDrawer';

/**
 * Deep-linkable full-page view of one PO return challan.
 */
export default function PoReturnChallanDetailPage() {
  const params = useParams<{ challanId: string }>();
  const challanId = params?.challanId;
  const { hasSubPermission, isLoading: navLoading } = useNavigation();
  const hasPermission = hasSubPermission(
    '/yarn-management/purchase-management',
    'PO Return Challan'
  );
  const [challan, setChallan] = useState<PoReturnChallan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!challanId || navLoading || !hasPermission) {
      if (!navLoading && !hasPermission) {
        setIsLoading(false);
        setChallan(null);
        setError(null);
      }
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    poReturnChallanService
      .getChallanById(challanId)
      .then((res) => {
        if (!cancelled) setChallan(res);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load challan';
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [challanId, hasPermission, navLoading]);

  return (
    <>
      <Seo title={challan?.challanNumber ? `Challan ${challan.challanNumber}` : 'PO Return Challan'} />
      <div className="main-content !p-[10px]">
        <div className="mb-3">
          <Link
            href="/yarn-management/purchase-management/po-return-challan"
            className="text-[11px] font-bold text-purple-700 hover:underline"
          >
            ← Back to challan history
          </Link>
        </div>

        {navLoading || isLoading ? (
          <div className="flex justify-center py-16" role="status" aria-label="Loading">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
          </div>
        ) : !hasPermission ? (
          <div className="box border border-gray-100">
            <div className="box-body text-center py-12">
              <p className="text-sm text-gray-600">You don&apos;t have permission to view this challan.</p>
            </div>
          </div>
        ) : error ? (
          <div className="box border border-gray-100">
            <div className="box-body text-center py-12 text-red-600 text-sm">{error}</div>
          </div>
        ) : challan ? (
          <div className="box border border-gray-100">
            <ChallanDetailDrawer
              challan={challan}
              onClose={() => {}}
              inline
              onUpdated={setChallan}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
