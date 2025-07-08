import { CreateStoreData, Store } from '@/shared/services/storeService';
import * as XLSX from 'xlsx';

export interface StoreImportRow {
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
  hankyNorms?: string;
  socksNorms?: string;
  towelNorms?: string;
}

export const validateStoreData = (data: StoreImportRow): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.storeId?.trim()) {
    errors.push('Store ID is required');
  } else if (!/^[A-Z0-9]+$/.test(data.storeId)) {
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

  const validCreditRatings = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
  if (!data.creditRating || !validCreditRatings.includes(data.creditRating)) {
    errors.push('Credit rating must be one of: A+, A, A-, B+, B, B-, C+, C, C-, D, F');
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as StoreImportRow[];

        const errors: string[] = [];
        const validData: StoreImportRow[] = [];

        jsonData.forEach((row, index) => {
          const validation = validateStoreData(row);
          if (!validation.isValid) {
            errors.push(`Row ${index + 2}: ${validation.errors.join(', ')}`);
          } else {
            validData.push(row);
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
    hankyNorms: parseFloat(row.hankyNorms || '0') || 0,
    socksNorms: parseFloat(row.socksNorms || '0') || 0,
    towelNorms: parseFloat(row.towelNorms || '0') || 0,
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
    { wch: 12 }, // Created At
    { wch: 12 }, // Updated At
  ];
  
  worksheet['!cols'] = columnWidths;

  XLSX.writeFile(workbook, filename);
};

export const generateSampleTemplate = () => {
  const sampleData = [
    {
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
      'Towel Norms': 25
    },
    {
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
      'Towel Norms': 15
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
      'Instructions': '1. Required fields: Store ID, Store Name, City, Address Line 1, Store Number, Pincode, Contact Person, Contact Email, Contact Phone',
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
      'Instructions': '10. Norms fields (Hanky, Socks, Towel) should be numbers (0 if not applicable)',
      '': ''
    }
  ];
  const wsInstructions = XLSX.utils.json_to_sheet(instructionsTemplate);
  XLSX.utils.book_append_sheet(workbook, wsInstructions, 'Instructions');
  
  XLSX.writeFile(workbook, 'store-import-template.xlsx');
}; 