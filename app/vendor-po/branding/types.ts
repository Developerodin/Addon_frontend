/** Single row in Branding queue — one (GRN, article) with fresh qty */
export interface BrandingQueueItem {
  id: string;
  grnNo: string;
  poNo: string;
  vendorName: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  freshQty: number;
  priority: string;
  receivedDate: string;
  status: "Pending" | "Completed";
  brandingCompletedAt?: string;
  remarks?: string;
  /** Audit: user who completed (optional) */
  completedBy?: string;
}
