/** One article line in a checking queue entry (received qty pending classification) */
export interface CheckingArticle {
  articleId: string;
  articleCode: string;
  articleName: string;
  receivedQty: number;
  notes?: string;
}

/** Classification inputs per article (Fresh, M4-Return, M4-Inhouse, M2, M3) */
export interface CheckingClassification {
  fresh: number;
  m4Return: number;
  m4Inhouse: number;
  m2: number;
  m3: number;
  remark?: string;
}

/** Classification totals per entry (stored when checking is completed, for dashboard M1/M2/M3/M4 stats) */
export interface CheckingTotals {
  totalM1: number;   // Fresh - good quality
  totalM2: number;
  totalM3: number;
  totalM4: number;   // M4-Return + M4-Inhouse
}

/** Per-article classification stored when checking is completed (for GRN detail) */
export interface ArticleClassificationRow {
  fresh: number;
  m4Return: number;
  m4Inhouse: number;
  m2: number;
  m3: number;
}

/** Single receive batch sent to checking queue */
export interface CheckingQueueEntry {
  id: string;
  poId: string;
  poNo: string;
  vendorName: string;
  priority: string;
  receiveId: string;
  receiveDate: string;
  status: "Pending" | "Completed";
  articles: CheckingArticle[];
  totalReceivedQty: number;
  grnNumber?: string;
  completedAt?: string;
  /** Set when status is Completed; used for M1/M2/M3/M4 dashboard cards */
  totals?: CheckingTotals;
  /** Per-article classification when completed; used for GRN detail view/print */
  articleClassifications?: Record<string, ArticleClassificationRow>;
}
