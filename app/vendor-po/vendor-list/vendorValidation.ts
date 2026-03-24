/** Digits only — for 10–15 effective length checks (API allows spaces/dashes in phone). */
export function effectivePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isPhonePolicyOk(phone: string): boolean {
  const d = effectivePhoneDigits(phone);
  return d.length >= 10 && d.length <= 15;
}

/** Empty/whitespace ok; else valid 15-char Indian GSTIN pattern. */
export function isGstinOptional(gstin: string): boolean {
  const t = gstin.trim();
  if (!t) return true;
  if (t.length !== 15) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(t);
}
