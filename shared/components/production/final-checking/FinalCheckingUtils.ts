import { Article, ArticleUpdateMap, ProductionOrder } from './FinalCheckingTypes';

export const getStatusBadge = (status: string) => {
  const statusClasses: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-green-100 text-green-800',
    'On Hold': 'bg-red-100 text-red-800',
  };
  return statusClasses[status] || 'bg-gray-100 text-gray-800';
};

export const getPriorityBadge = (priority: string) => {
  const priorityClasses: Record<string, string> = {
    'Urgent': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800',
  };
  return priorityClasses[priority] || 'bg-gray-100 text-gray-800';
};

export function calculateOrderProgress(article: Article, updateMap: ArticleUpdateMap): { progress: number; status: string } {
  const update = updateMap[article.id];
  const completed = update ? update.completedQuantity : article.completedQuantity;
  const progress = Math.round((completed / article.plannedQuantity) * 100);
  const status = completed >= article.plannedQuantity ? 'Completed' : completed > 0 ? 'In Progress' : 'Pending';
  return { progress, status };
}

export function aggregateCheckedQuantities(order: ProductionOrder): { m1: number; m2: number; m3: number; m4: number } {
  return order.articles.reduce(
    (acc, a) => {
      acc.m1 += a.m1Quantity;
      acc.m2 += a.m2Quantity;
      acc.m3 += a.m3Quantity;
      acc.m4 += a.m4Quantity;
      return acc;
    },
    { m1: 0, m2: 0, m3: 0, m4: 0 },
  );
}

export function shiftFromM2(articleId: string, qty: number, target: 'M1' | 'M3' | 'M4', updateMap: ArticleUpdateMap): ArticleUpdateMap {
  const cur = updateMap[articleId];
  if (!cur) return updateMap;
  const shiftQty = Math.max(0, Math.min(qty, cur.m2Quantity));
  const next = { ...cur };
  next.m2Quantity -= shiftQty;
  if (target === 'M1') next.m1Quantity += shiftQty;
  if (target === 'M3') next.m3Quantity += shiftQty;
  if (target === 'M4') next.m4Quantity += shiftQty;
  return { ...updateMap, [articleId]: next };
}


