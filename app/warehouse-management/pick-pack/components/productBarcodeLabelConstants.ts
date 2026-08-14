/** Static legal copy printed on every 50×70mm MRP sticker. */
export const PRODUCT_LABEL_MANUFACTURER = {
  heading: "Manufactured, Packed & Marketed by:",
  name: "Addon Holdings Private Limited",
  address: "B-7/G, Asmeeta Textile Park, Kongaon, Bhiwandi, Thane - 421 302. Maharashtra.",
} as const;

export const PRODUCT_LABEL_CUSTOMER_CARE = {
  intro:
    "For Customer Complaints contact Customer Care Executive at the same address as above",
  email: "customerservice@addbr.com",
  phone: "+91-2522-297431",
} as const;

export const PRODUCT_LABEL_LICENSOR = {
  heading: "Under License From:",
  name: "Aditya Birla Lifestyle Brands Limited",
  address:
    "Piramal Agastya Corporate Park, Building 'A', 401, 403, 501, 502, L.B.S. Road, Kurla, Mumbai - 400 070. Maharashtra.",
} as const;

/** Thermal sticker size used by warehouse barcode printers. */
export const PRODUCT_LABEL_SIZE_MM = { width: 50, height: 70 } as const;
