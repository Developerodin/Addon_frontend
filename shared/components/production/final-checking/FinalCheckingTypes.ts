export type RepairStatus = 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
export type Priority = 'High' | 'Medium' | 'Low' | 'Urgent';
export type OrderStatus = 'Pending' | 'In Progress' | 'Completed' | 'On Hold';

export interface Article {
  id: string;
  articleNumber: string;
  plannedQuantity: number;
  completedQuantity: number;
  linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
  priority: Priority;
  status: OrderStatus;
  progress: number;
  currentFloor: string;
  remarks?: string;
  // Article-wise checked quantities
  m1Quantity: number;
  m2Quantity: number;
  m3Quantity: number;
  m4Quantity: number;
  // Repair sub-step tracking
  repairStatus: RepairStatus;
  repairRemarks?: string;
  // Final quality confirmation for this article
  finalQualityConfirmed?: boolean;
}

export interface ProductionOrder {
  id: string;
  priority: Priority;
  status: OrderStatus;
  articles: Article[];
  floor: string;
  createdAt: string;
  updatedAt: string;
  // Whether this order has been forwarded to branding
  forwardedToBranding?: boolean;
}

export interface ArticleUpdatePayload {
  completedQuantity: number;
  remarks: string;
  m1Quantity: number;
  m2Quantity: number;
  m3Quantity: number;
  m4Quantity: number;
  repairStatus: RepairStatus;
  repairRemarks: string;
}

export type ArticleUpdateMap = Record<string, ArticleUpdatePayload>;


