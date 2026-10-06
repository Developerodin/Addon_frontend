/**
 * Page numbers for the clients table, with ellipses once there are more than 7 pages.
 */
export function getWarehouseClientPagination(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  if (currentPage > 4) pages.push("...");
  for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
    pages.push(i);
  }
  if (currentPage < totalPages - 3) pages.push("...");
  pages.push(totalPages);
  return pages;
}
