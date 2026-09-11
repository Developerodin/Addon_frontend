export type StorageWeightBucket = {
  netWeight?: number;
  totalWeight?: number;
};

/**
 * Yarn net kg from an inventory storage bucket.
 * Prefers `netWeight` so LTS/unallocated never display carton gross.
 * @param bucket - API longTermStorage / shortTermStorage / unallocatedStorage
 * @returns Net kg (>= 0)
 */
export function storageBucketNetKg(bucket?: StorageWeightBucket | null): number {
  if (!bucket) return 0;
  const preferred = bucket.netWeight ?? bucket.totalWeight;
  const n = Number(preferred);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
