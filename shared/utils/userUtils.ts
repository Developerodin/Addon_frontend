/**
 * Check if the current user is the design user (design@addon.in)
 * @param user - User object from Redux store
 * @returns boolean indicating if user is design user
 */
export const isDesignUser = (user: any): boolean => {
  if (!user || !user.email) {
    return false;
  }
  return user.email.toLowerCase() === 'design@addon.in';
};

/**
 * Check if the current user is the production user (production@addon.in)
 * @param user - User object from Redux store
 * @returns boolean indicating if user is production user
 */
export const isProductionUser = (user: any): boolean => {
  if (!user || !user.email) {
    return false;
  }
  return user.email.toLowerCase() === 'production@addon.in';
};

/**
 * Check if the current user is the final user (itemfinal@addon.in)
 * @param user - User object from Redux store
 * @returns boolean indicating if user is final user
 */
export const isFinalUser = (user: any): boolean => {
  if (!user || !user.email) {
    return false;
  }
  return user.email.toLowerCase() === 'itemfinal@addon.in';
};

/**
 * Get allowed attribute names for final user
 * These attributes should be visible to itemfinal@addon.in user
 */
export const getAllowedFinalAttributes = (): string[] => {
  return [
    'brand',
    'age group',
    'mrp'
  ];
};

/**
 * Check if an attribute should be visible to final user
 * @param attributeName - Name of the attribute
 * @param isFinalUser - Whether current user is final user
 * @returns boolean indicating if attribute should be visible
 */
export const shouldShowAttributeForFinal = (attributeName: string, isFinalUser: boolean): boolean => {
  if (!isFinalUser) {
    return false; // Only check for final user
  }
  
  const allowedAttributes = getAllowedFinalAttributes();
  const normalizedAttributeName = attributeName.toLowerCase().trim();
  
  return allowedAttributes.some(allowed => 
    allowed.toLowerCase() === normalizedAttributeName
  );
};

/**
 * Get allowed attribute names for design user
 * These attributes should be visible to design@addon.in user
 */
export const getAllowedDesignAttributes = (): string[] => {
  return [
    'product',
    'gender',
    'type',
    'occasion',
    'thickness',
    'pack',
    'color',
    'pattern',
    'season',
    'foot length'
  ];
};

/**
 * Check if an attribute should be visible to design user
 * @param attributeName - Name of the attribute
 * @param isDesignUser - Whether current user is design user
 * @returns boolean indicating if attribute should be visible
 */
export const shouldShowAttribute = (attributeName: string, isDesignUser: boolean): boolean => {
  if (!isDesignUser) {
    return true; // Show all attributes for non-design users
  }
  
  const allowedAttributes = getAllowedDesignAttributes();
  const normalizedAttributeName = attributeName.toLowerCase().trim();
  
  return allowedAttributes.some(allowed => 
    allowed.toLowerCase() === normalizedAttributeName
  );
};

