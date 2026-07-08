/** Store profile fields stored in uppercase. */
export const UPPERCASE_STORE_PROFILE_FIELDS = new Set([
  'billCode',
  'sapCode',
  'retekCode',
  'classification',
  'city',
  'state',
  'gst',
]);

/** Root form fields stored in uppercase while typing and on submit. */
export const UPPERCASE_TEXT_FIELDS = new Set([
  'parentKeyCode',
  'gstin',
  'city',
  'state',
  'rsm',
  'asm',
  'se',
  'dso',
  'outlet',
]);

/**
 * Apply per-field input normalization (e.g. force uppercase codes).
 */
export function normalizeWarehouseClientInput(key: string, value: string): string {
  if (UPPERCASE_TEXT_FIELDS.has(key) || UPPERCASE_STORE_PROFILE_FIELDS.has(key)) {
    return value.toUpperCase();
  }
  return value;
}

/**
 * Final sanitize before API payload (trim + uppercase codes).
 */
export function sanitizeWarehouseClientFieldValue(key: string, value: string): string {
  const trimmed = value.trim();
  if (UPPERCASE_TEXT_FIELDS.has(key) || UPPERCASE_STORE_PROFILE_FIELDS.has(key)) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

/**
 * Validate a single Trade/Dept/Ecom root field; returns an error message or null.
 */
export function validateWarehouseClientField(key: string, value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  if (key === 'gstin') {
    const u = v.toUpperCase();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(u)) {
      return 'Enter a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5)';
    }
    return null;
  }

  if (key === 'city') {
    if (v.length < 2 || v.length > 100) return 'City must be 2–100 characters';
    if (!/^[A-Za-z][A-Za-z\s.-]*$/.test(v)) return 'City may contain letters, spaces, dots and hyphens only';
    return null;
  }

  if (key === 'state') {
    if (v.length < 2 || v.length > 50) return 'State must be 2–50 characters';
    if (!/^[A-Za-z][A-Za-z\s]*$/.test(v)) return 'State may contain letters and spaces only';
    return null;
  }

  if (key === 'parentKeyCode') {
    if (v.length > 50) return 'Parent key code must be at most 50 characters';
    if (!/^[A-Za-z0-9-]+$/.test(v)) return 'Parent key code may contain letters, numbers and hyphens only';
    return null;
  }

  if (['rsm', 'asm', 'se', 'dso', 'outlet'].includes(key)) {
    if (v.length > 80) return 'Must be at most 80 characters';
    if (!/^[A-Za-z0-9\s.-]+$/.test(v)) return 'Letters, numbers, spaces, dots and hyphens only';
    return null;
  }

  return null;
}

/**
 * Validate all root fields; returns a map of field key → error message.
 */
export function validateWarehouseClientRoot(
  root: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of UPPERCASE_TEXT_FIELDS) {
    const raw = root[key];
    if (typeof raw !== 'string') continue;
    const msg = validateWarehouseClientField(key, raw);
    if (msg) errors[key] = msg;
  }
  return errors;
}
