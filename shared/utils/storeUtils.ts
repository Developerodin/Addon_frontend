import { CreateStoreData, Store } from '@/shared/services/storeService';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import * as XLSX from 'xlsx';

export interface StoreImportRow {
  id?: string; // For updating existing stores
  storeId: string;
  storeName: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  storeNumber: string;
  pincode: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  creditRating: string;
  isActive: string;
  // Optional fields
  bpCode?: string;
  oldStoreCode?: string;
  bpName?: string;
  street?: string;
  block?: string;
  zipCode?: string;
  state?: string;
  country?: string;
  telephone?: string;
  internalSapCode?: string;
  internalSoftwareCode?: string;
  brandGrouping?: string;
  brand?: string;
  hankyNorms?: string;
  socksNorms?: string;
  towelNorms?: string;
  totalNorms?: string;
}

export interface ImportProgress {
  currentBatch: number;
  totalBatches: number;
  processedStores: number;
  totalStores: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  isComplete: boolean;
}

export interface BulkImportResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  message: string;
}

export const validateStoreData = (data: StoreImportRow): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Required fields validation
  if (!data.storeId?.trim()) {
    errors.push('Store ID is required');
  } else if (!/^[A-Z0-9]+$/.test(data.storeId.toUpperCase())) {
    errors.push('Store ID must contain only uppercase letters and numbers');
  }

  if (!data.storeName?.trim()) {
    errors.push('Store name is required');
  }

  if (!data.city?.trim()) {
    errors.push('City is required');
  }

  if (!data.addressLine1?.trim()) {
    errors.push('Address is required');
  }

  if (!data.storeNumber?.trim()) {
    errors.push('Store number is required');
  }

  if (!data.pincode?.trim()) {
    errors.push('Pincode is required');
  } else if (!/^\d{6}$/.test(data.pincode)) {
    errors.push('Pincode must be exactly 6 digits');
  }

  if (!data.contactPerson?.trim()) {
    errors.push('Contact person is required');
  }

  if (!data.contactEmail?.trim()) {
    errors.push('Contact email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
    errors.push('Please enter a valid email address');
  }

  if (!data.contactPhone?.trim()) {
    errors.push('Contact phone is required');
  } else if (!/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(data.contactPhone.replace(/\s/g, ''))) {
    errors.push('Please enter a valid phone number');
  }

  // Credit rating validation
  const validCreditRatings = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
  if (!data.creditRating || !validCreditRatings.includes(data.creditRating)) {
    errors.push('Credit rating must be one of: A+, A, A-, B+, B, B-, C+, C, C-, D, F');
  }

  // Optional fields validation
  if (data.hankyNorms && (isNaN(Number(data.hankyNorms)) || Number(data.hankyNorms) < 0)) {
    errors.push('Hanky norms must be a non-negative number');
  }

  if (data.socksNorms && (isNaN(Number(data.socksNorms)) || Number(data.socksNorms) < 0)) {
    errors.push('Socks norms must be a non-negative number');
  }

  if (data.towelNorms && (isNaN(Number(data.towelNorms)) || Number(data.towelNorms) < 0)) {
    errors.push('Towel norms must be a non-negative number');
  }

  if (data.totalNorms && (isNaN(Number(data.totalNorms)) || Number(data.totalNorms) < 0)) {
    errors.push('Total norms must be a non-negative number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const parseExcelFile = (file: File): Promise<{ data: StoreImportRow[]; errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const errors: string[] = [];
        const validData: StoreImportRow[] = [];

        jsonData.forEach((row, index) => {
          // Map Excel column names to our interface
          const mappedRow: StoreImportRow = {
            id: row['ID'] || undefined,
            storeId: row['Store ID'] || row['storeId'] || '',
            storeName: row['Store Name'] || row['storeName'] || '',
            city: row['City'] || row['city'] || '',
            addressLine1: row['Address Line 1'] || row['addressLine1'] || '',
            addressLine2: row['Address Line 2'] || row['addressLine2'] || '',
            storeNumber: row['Store Number'] || row['storeNumber'] || '',
            pincode: row['Pincode'] || row['pincode'] || '',
            contactPerson: row['Contact Person'] || row['contactPerson'] || '',
            contactEmail: row['Contact Email'] || row['contactEmail'] || '',
            contactPhone: row['Contact Phone'] || row['contactPhone'] || '',
            creditRating: row['Credit Rating'] || row['creditRating'] || '',
            isActive: row['Is Active'] || row['isActive'] || '',
            // Optional fields
            bpCode: row['BP Code'] || row['bpCode'] || '',
            oldStoreCode: row['Old Store Code'] || row['oldStoreCode'] || '',
            bpName: row['BP Name'] || row['bpName'] || '',
            street: row['Street'] || row['street'] || '',
            block: row['Block'] || row['block'] || '',
            zipCode: row['Zip Code'] || row['zipCode'] || '',
            state: row['State'] || row['state'] || '',
            country: row['Country'] || row['country'] || '',
            telephone: row['Telephone'] || row['telephone'] || '',
            internalSapCode: row['Internal SAP Code'] || row['internalSapCode'] || '',
            internalSoftwareCode: row['Internal Software Code'] || row['internalSoftwareCode'] || '',
            brandGrouping: row['Brand Grouping'] || row['brandGrouping'] || '',
            brand: row['Brand'] || row['brand'] || '',
            hankyNorms: row['Hanky Norms'] || row['hankyNorms'] || '',
            socksNorms: row['Socks Norms'] || row['socksNorms'] || '',
            towelNorms: row['Towel Norms'] || row['towelNorms'] || '',
            totalNorms: row['Total Norms'] || row['totalNorms'] || ''
          };

          const validation = validateStoreData(mappedRow);
          if (!validation.isValid) {
            errors.push(`Row ${index + 2}: ${validation.errors.join(', ')}`);
          } else {
            validData.push(mappedRow);
          }
        });

        resolve({ data: validData, errors });
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const convertToCreateStoreData = (row: StoreImportRow): CreateStoreData => {
  const hankyNorms = parseFloat(row.hankyNorms || '0') || 0;
  const socksNorms = parseFloat(row.socksNorms || '0') || 0;
  const towelNorms = parseFloat(row.towelNorms || '0') || 0;
  const totalNorms = parseFloat(row.totalNorms || '0') || (hankyNorms + socksNorms + towelNorms);

  return {
    storeId: row.storeId.toUpperCase(),
    storeName: row.storeName.trim(),
    city: row.city.trim(),
    addressLine1: row.addressLine1.trim(),
    addressLine2: row.addressLine2?.trim() || '',
    storeNumber: row.storeNumber.trim(),
    pincode: row.pincode.trim(),
    contactPerson: row.contactPerson.trim(),
    contactEmail: row.contactEmail.toLowerCase().trim(),
    contactPhone: row.contactPhone.trim(),
    creditRating: row.creditRating as CreateStoreData['creditRating'],
    isActive: row.isActive?.toLowerCase() === 'true' || row.isActive?.toLowerCase() === 'yes' || row.isActive?.toLowerCase() === '1',
    // Optional fields
    bpCode: row.bpCode?.trim() || undefined,
    oldStoreCode: row.oldStoreCode?.trim() || undefined,
    bpName: row.bpName?.trim() || undefined,
    street: row.street?.trim() || undefined,
    block: row.block?.trim() || undefined,
    zipCode: row.zipCode?.trim() || undefined,
    state: row.state?.trim() || undefined,
    country: row.country?.trim() || undefined,
    telephone: row.telephone?.trim() || undefined,
    internalSapCode: row.internalSapCode?.trim() || undefined,
    internalSoftwareCode: row.internalSoftwareCode?.trim() || undefined,
    brandGrouping: row.brandGrouping?.trim() || undefined,
    brand: row.brand?.trim() || undefined,
    hankyNorms,
    socksNorms,
    towelNorms,
    totalNorms,
  };
};

export const exportStoresToExcel = (stores: Store[], filename: string = 'stores-export.xlsx') => {
  const exportData = stores.map(store => ({
    'ID': store.id,
    'Store ID': store.storeId,
    'Store Name': store.storeName,
    'City': store.city,
    'Address Line 1': store.addressLine1,
    'Address Line 2': store.addressLine2 || '',
    'Store Number': store.storeNumber,
    'Pincode': store.pincode,
    'Contact Person': store.contactPerson,
    'Contact Email': store.contactEmail,
    'Contact Phone': store.contactPhone,
    'Credit Rating': store.creditRating,
    'Is Active': store.isActive ? 'true' : 'false',
    // Optional fields
    'BP Code': store.bpCode || '',
    'Old Store Code': store.oldStoreCode || '',
    'BP Name': store.bpName || '',
    'Street': store.street || '',
    'Block': store.block || '',
    'Zip Code': store.zipCode || '',
    'State': store.state || '',
    'Country': store.country || '',
    'Telephone': store.telephone || '',
    'Internal SAP Code': store.internalSapCode || '',
    'Internal Software Code': store.internalSoftwareCode || '',
    'Brand Grouping': store.brandGrouping || '',
    'Brand': store.brand || '',
    'Hanky Norms': store.hankyNorms || 0,
    'Socks Norms': store.socksNorms || 0,
    'Towel Norms': store.towelNorms || 0,
    'Total Norms': store.totalNorms || 0,
    // Metadata fields
    'Created At': new Date(store.createdAt).toLocaleDateString(),
    'Updated At': new Date(store.updatedAt).toLocaleDateString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stores');
  
  // Auto-size columns for better readability
  const columnWidths = [
    { wch: 24 }, // ID
    { wch: 12 }, // Store ID
    { wch: 25 }, // Store Name
    { wch: 15 }, // City
    { wch: 30 }, // Address Line 1
    { wch: 25 }, // Address Line 2
    { wch: 15 }, // Store Number
    { wch: 10 }, // Pincode
    { wch: 20 }, // Contact Person
    { wch: 25 }, // Contact Email
    { wch: 15 }, // Contact Phone
    { wch: 12 }, // Credit Rating
    { wch: 10 }, // Is Active
    { wch: 12 }, // BP Code
    { wch: 15 }, // Old Store Code
    { wch: 20 }, // BP Name
    { wch: 20 }, // Street
    { wch: 12 }, // Block
    { wch: 10 }, // Zip Code
    { wch: 15 }, // State
    { wch: 15 }, // Country
    { wch: 15 }, // Telephone
    { wch: 18 }, // Internal SAP Code
    { wch: 20 }, // Internal Software Code
    { wch: 15 }, // Brand Grouping
    { wch: 15 }, // Brand
    { wch: 12 }, // Hanky Norms
    { wch: 12 }, // Socks Norms
    { wch: 12 }, // Towel Norms
    { wch: 12 }, // Total Norms
    { wch: 12 }, // Created At
    { wch: 12 }, // Updated At
  ];
  
  worksheet['!cols'] = columnWidths;

  XLSX.writeFile(workbook, filename);
};

export const generateSampleTemplate = () => {
  const sampleData = [
    {
      'ID': '', // Leave empty for new stores, include ID for updates
      'Store ID': 'STORE001',
      'Store Name': 'Main Street Store',
      'City': 'Mumbai',
      'Address Line 1': '123 Main Street',
      'Address Line 2': 'Building A, Floor 2',
      'Store Number': 'A101',
      'Pincode': '400001',
      'Contact Person': 'John Doe',
      'Contact Email': 'john.doe@store.com',
      'Contact Phone': '+91-9876543210',
      'Credit Rating': 'A+',
      'Is Active': 'true',
      // Optional fields
      'BP Code': 'BP001',
      'Old Store Code': 'OLD001',
      'BP Name': 'Business Partner Name',
      'Street': 'Main Street',
      'Block': 'Block A',
      'Zip Code': '400001',
      'State': 'Maharashtra',
      'Country': 'India',
      'Telephone': '+91-22-12345678',
      'Internal SAP Code': 'SAP001',
      'Internal Software Code': 'SW001',
      'Brand Grouping': 'Premium',
      'Brand': 'Brand Name',
      'Hanky Norms': 100,
      'Socks Norms': 50,
      'Towel Norms': 25,
      'Total Norms': 175
    },
    {
      'ID': '', // Leave empty for new stores, include ID for updates
      'Store ID': 'STORE002',
      'Store Name': 'Downtown Store',
      'City': 'Delhi',
      'Address Line 1': '456 Downtown Avenue',
      'Address Line 2': 'Shopping Complex',
      'Store Number': 'B202',
      'Pincode': '110001',
      'Contact Person': 'Jane Smith',
      'Contact Email': 'jane.smith@store.com',
      'Contact Phone': '+91-9876543211',
      'Credit Rating': 'A',
      'Is Active': 'true',
      // Optional fields
      'BP Code': 'BP002',
      'Old Store Code': 'OLD002',
      'BP Name': 'Another Business Partner',
      'Street': 'Downtown Avenue',
      'Block': 'Block B',
      'Zip Code': '110001',
      'State': 'Delhi',
      'Country': 'India',
      'Telephone': '+91-11-12345678',
      'Internal SAP Code': 'SAP002',
      'Internal Software Code': 'SW002',
      'Brand Grouping': 'Standard',
      'Brand': 'Another Brand',
      'Hanky Norms': 75,
      'Socks Norms': 30,
      'Towel Norms': 15,
      'Total Norms': 120
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stores');

  // Add instructions sheet
  const instructionsTemplate = [
    {
      'Instructions': 'How to use this Store Import Template:',
      '': ''
    },
    {
      'Instructions': '1. Required fields: Store ID, Store Name, City, Address Line 1, Store Number, Pincode, Contact Person, Contact Email, Contact Phone, Credit Rating',
      '': ''
    },
    {
      'Instructions': '2. ID field: Leave empty for new stores, include ID for updating existing stores',
      '': ''
    },
    {
      'Instructions': '3. Store ID must be unique and contain only uppercase letters and numbers',
      '': ''
    },
    {
      'Instructions': '4. Pincode must be exactly 6 digits',
      '': ''
    },
    {
      'Instructions': '5. Contact Email must be a valid email format',
      '': ''
    },
    {
      'Instructions': '6. Contact Phone must be a valid phone number (10-15 digits)',
      '': ''
    },
    {
      'Instructions': '7. Credit Rating must be one of: A+, A, A-, B+, B, B-, C+, C, C-, D, F',
      '': ''
    },
    {
      'Instructions': '8. Is Active: Use "true", "yes", or "1" for active stores, "false", "no", or "0" for inactive',
      '': ''
    },
    {
      'Instructions': '9. All other fields are optional',
      '': ''
    },
    {
      'Instructions': '10. Norms fields (Hanky, Socks, Towel, Total) should be numbers (0 if not applicable)',
      '': ''
    },
    {
      'Instructions': '11. Total Norms will be auto-calculated if not provided',
      '': ''
    },
    {
      'Instructions': '12. Maximum 1000 stores per import, processed in batches of 25-100',
      '': ''
    }
  ];
  const wsInstructions = XLSX.utils.json_to_sheet(instructionsTemplate);
  XLSX.utils.book_append_sheet(workbook, wsInstructions, 'Instructions');
  
  XLSX.writeFile(workbook, 'store-import-template.xlsx');
};

// Bulk import functionality
export const processBulkImport = async (
  file: File,
  onProgress: (progress: ImportProgress) => void,
  batchSize: number = 25,
  maxBatchSize: number = 100
): Promise<BulkImportResult> => {
  try {
    // Parse the Excel file
    const { data: rawData, errors: parseErrors } = await parseExcelFile(file);
    
    if (parseErrors.length > 0) {
      return {
        success: false,
        totalProcessed: 0,
        successCount: 0,
        errorCount: parseErrors.length,
        errors: parseErrors,
        message: 'File parsing failed. Please check the file format and data.'
      };
    }

    if (rawData.length === 0) {
      return {
        success: false,
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0,
        errors: ['No valid data found in the file'],
        message: 'No valid data found in the file.'
      };
    }

    // Validate all data
    const validationErrors: string[] = [];
    const validData: StoreImportRow[] = [];

    rawData.forEach((row, index) => {
      const validation = validateStoreData(row);
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          validationErrors.push(`Row ${index + 2}: ${error}`);
        });
      } else {
        validData.push(row);
      }
    });

    if (validationErrors.length > 0) {
      return {
        success: false,
        totalProcessed: 0,
        successCount: 0,
        errorCount: validationErrors.length,
        errors: validationErrors,
        message: 'Data validation failed. Please fix the errors and try again.'
      };
    }

    // Convert to API format
    const storesData = validData.map(row => {
      const storeData = convertToCreateStoreData(row);
      // If ID is provided, it's an update operation
      if (row.id) {
        return { ...storeData, id: row.id };
      }
      return storeData;
    });

    // Split into batches
    const batches: any[][] = [];
    const actualBatchSize = Math.min(batchSize, maxBatchSize);
    
    for (let i = 0; i < storesData.length; i += actualBatchSize) {
      batches.push(storesData.slice(i, i + actualBatchSize));
    }

    // Initialize progress
    let totalProcessed = 0;
    let successCount = 0;
    let errorCount = 0;
    const allErrors: string[] = [];

    // Process batches
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Update progress
      onProgress({
        currentBatch: batchIndex + 1,
        totalBatches: batches.length,
        processedStores: totalProcessed,
        totalStores: storesData.length,
        successCount,
        errorCount,
        errors: allErrors,
        isComplete: false
      });

      try {
        // Import the batch
        const response = await fetch(`${API_BASE_URL}/stores/bulk-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stores: batch,
            batchSize: actualBatchSize
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Update counters
        totalProcessed += batch.length;
        successCount += result.successCount || batch.length;
        errorCount += result.errorCount || 0;
        
        if (result.errors && Array.isArray(result.errors)) {
          allErrors.push(...result.errors);
        }

        // Add delay between batches to prevent overwhelming the server
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        // Handle batch failure
        totalProcessed += batch.length;
        errorCount += batch.length;
        allErrors.push(`Batch ${batchIndex + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Continue with next batch instead of stopping completely
        continue;
      }
    }

    // Final progress update
    onProgress({
      currentBatch: batches.length,
      totalBatches: batches.length,
      processedStores: totalProcessed,
      totalStores: storesData.length,
      successCount,
      errorCount,
      errors: allErrors,
      isComplete: true
    });

    return {
      success: errorCount === 0,
      totalProcessed,
      successCount,
      errorCount,
      errors: allErrors,
      message: errorCount === 0 
        ? `Successfully imported ${successCount} stores!`
        : `Import completed with ${successCount} successful and ${errorCount} failed imports.`
    };

  } catch (error) {
    return {
      success: false,
      totalProcessed: 0,
      successCount: 0,
      errorCount: 1,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      message: 'Import failed due to an unexpected error.'
    };
  }
}; 