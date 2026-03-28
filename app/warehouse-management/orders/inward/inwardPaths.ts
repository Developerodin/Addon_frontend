/**
 * WHMS GRN inward base path. Top-level `/warehouse-management/inward` is production warehouse
 * receiving (shared dashboard); GRN list/detail always live under Orders.
 */
export function whmsInwardBasePath(_pathname: string | null): string {
  return "/warehouse-management/orders/inward";
}
