/**
 * Collapse a whole file uploaded with the wrong button into one instruction.
 * @param {string[]} errors
 * @returns {string[]}
 */
export function summarizeWarehouseClientImportErrors(errors: string[]): string[] {
  if (errors.length < 2) return errors;
  const allStoreOnTrade = errors.every((error) => error.includes('Use the Import Store button.'));
  if (allStoreOnTrade) {
    return [
      `All ${errors.length} rows have Channel "Store". Use the Import Store button. Import Trade / Dept / Ecom is only for Trade, Departmental, and Ecom.`,
    ];
  }
  const allTradeOnStore = errors.every((error) => error.includes('Use Import Trade / Dept / Ecom'));
  if (allTradeOnStore) {
    return [
      `These rows are not Store. Use Import Trade / Dept / Ecom.`,
      ...errors.slice(0, 20),
    ];
  }
  return errors;
}

/**
 * Turn a bulk-import API message into lines a user can fix in the spreadsheet.
 * Covers the old Joi alternatives text (`"[1057]" does not match any of the allowed types`).
 */
export function humanizeWarehouseClientApiError(message: string): string[] {
  const text = message.trim();
  if (!text) return ["Import failed. Check the spreadsheet and try again."];

  if (text.includes("does not match any of the allowed types")) {
    const indexes = [...text.matchAll(/"\[(\d+)\]"/g)].map((match) => Number(match[1]));
    if (!indexes.length) {
      return [
        "Import failed. Check Channel (Store, Trade, Departmental, or Ecom) and Opening Date (YYYY-MM-DD, or blank).",
      ];
    }
    const preview = indexes.slice(0, 8).map((index) => `row ${index + 2}`);
    const more = indexes.length > 8 ? `, and ${indexes.length - 8} more` : "";
    return [
      `Import failed on ${preview.join(", ")}${more}. Check Channel and Opening Date on those spreadsheet rows. Channel must be Store, Trade, Departmental, or Ecom. Opening Date must be YYYY-MM-DD (example: 2026-09-18) or blank. Nothing was saved.`,
    ];
  }

  const parts = text.split(/\s+\|\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : [text];
}
