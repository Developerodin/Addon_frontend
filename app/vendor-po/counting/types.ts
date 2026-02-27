/** Single row in Counting & Dispatch queue — moved from Final Checking when final check completed */
export interface CountingItem {
  id: string;
  grnNo: string;
  poNo: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  expectedQty: number;
  countedQty: number;
  boxes?: number;
  remarks?: string;
  status: "Pending Counting" | "Dispatched";
  discrepancyReason?: string;
  dispatchedAt?: string;
  dispatchedBy?: string;
}
