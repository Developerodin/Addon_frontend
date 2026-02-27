/** Single row in Final Checking queue — moved from Branding when branding completed */
export interface FinalCheckingItem {
  id: string;
  grnNo: string;
  poNo: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  qty: number;
  brandingCompletedAt: string;
  status: "Pending" | "Completed";
  finalCheckingCompletedAt?: string;
  completedBy?: string;
}
