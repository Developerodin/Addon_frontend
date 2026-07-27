/**
 * Canonical Addon legal entity details for printed documents (GRN, PO, challans).
 * Snapshot consignee fields fall back to these when empty on legacy GRNs.
 */
export const ADDON_COMPANY = {
  name: 'ADDON HOLDINGS PRIVATE LIMITED',
  address:
    'Bldg.No.B-7/GF, Asmeeta Textile Park, Addl.Kalyan Bhiwandi MIDC Indl. Area, Village Kone, Taluka Bhiwandi, Dist. Thane - 421311.',
  headOffice:
    '501- 502, Simba Commercial Premises, Off Western Express Highway, Near Virwani Indl Estate, Goregaon (E), Mumbai - 400 063.',
  contactNumber: '+91-2522-297432',
  gstNo: '27AAACA8827A1ZZ',
  stateCode: '27',
  state: 'Maharashtra',
  email: 'designer1@addbr.com',
} as const;
