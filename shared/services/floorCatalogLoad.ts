/**
 * True when a floor catalog request was replaced or the page moved on.
 * Those calls must not toast. A real failure still should.
 * @param error Value caught around getFloorOrders
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return error instanceof Error && error.name === "AbortError";
}
