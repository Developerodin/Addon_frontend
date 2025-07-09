import { API_BASE_URL } from '@/shared/data/utilities/api';
import { ErrorHandler } from '@/shared/utils/errorHandler';

export interface SalesRecord {
  date?: string;
  plant: string;
  materialCode: string;
  quantity: number;
  mrp: number;
  discount?: number;
  gsv: number;
  nsv: number;
  totalTax?: number;
}

export interface BulkImportRequest {
  salesRecords: SalesRecord[];
  batchSize?: number;
}

// Alternative structure that might be expected by the API
export interface BulkImportRequestV2 {
  stores: SalesRecord[];
  products: SalesRecord[];
  items: SalesRecord[];
  batchSize?: number;
}

export interface ImportProgress {
  current: number;
  total: number;
  percentage: number;
  status: 'processing' | 'completed' | 'failed';
  message?: string;
  errors?: string[];
}

export interface TemplateColumn {
  header: string;
  key: keyof SalesRecord;
  required: boolean;
  description: string;
  example: string;
}

export const TEMPLATE_COLUMNS: TemplateColumn[] = [
  {
    header: 'Date',
    key: 'date',
    required: false,
    description: 'Sale date (DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY)',
    example: '15-01-2024'
  },
  {
    header: 'Plant',
    key: 'plant',
    required: true,
    description: 'Store ID',
    example: 'STORE001'
  },
  {
    header: 'Material Code',
    key: 'materialCode',
    required: true,
    description: 'Product Style Code',
    example: 'STYLE123'
  },
  {
    header: 'Quantity',
    key: 'quantity',
    required: true,
    description: 'Number of items sold',
    example: '100'
  },
  {
    header: 'MRP',
    key: 'mrp',
    required: true,
    description: 'Maximum Retail Price',
    example: '150.50'
  },
  {
    header: 'Discount',
    key: 'discount',
    required: false,
    description: 'Discount amount',
    example: '10'
  },
  {
    header: 'GSV',
    key: 'gsv',
    required: true,
    description: 'Gross Sales Value',
    example: '135.45'
  },
  {
    header: 'NSV',
    key: 'nsv',
    required: true,
    description: 'Net Sales Value',
    example: '120.40'
  },
  {
    header: 'Total Tax',
    key: 'totalTax',
    required: false,
    description: 'Total tax amount',
    example: '15.05'
  }
];

export class SalesImportService {
  static async downloadTemplate(): Promise<void> {
    try {
      // Create CSV content
      const headers = TEMPLATE_COLUMNS.map(col => col.header).join(',');
      const examples = TEMPLATE_COLUMNS.map(col => col.example).join(',');
      const descriptions = TEMPLATE_COLUMNS.map(col => col.description).join(',');
      
      const csvContent = `${headers}\n${examples}\n${descriptions}`;
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sales_import_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      ErrorHandler.logError(error, 'TemplateDownload');
      throw new Error('Failed to download template');
    }
  }

  static async testApiStructure(): Promise<void> {
    try {
      const testRecord: SalesRecord = {
        plant: "MUMBAI001",
        materialCode: "T-SHIRT-BLUE",
        quantity: 50,
        mrp: 299,
        discount: 20,
        gsv: 11960,
        nsv: 10764,
        totalTax: 1196,
        date: "2024-01-15T00:00:00.000Z"
      };

      console.log('Testing API structure with:', testRecord);

      // Test different formats
      const formats = [
        { name: 'Format 1: salesRecords', data: { salesRecords: [testRecord], batchSize: 1 } },
        { name: 'Format 2: stores/products/items', data: { stores: [testRecord], products: [testRecord], items: [testRecord], batchSize: 1 } },
        { name: 'Format 3: direct array', data: [testRecord] }
      ];

      for (const format of formats) {
        try {
          console.log(`Testing ${format.name}:`, format.data);
          
          const response = await fetch(`${API_BASE_URL}/sales/bulk-import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(format.data)
          });

          const result = await response.json();
          console.log(`${format.name} result:`, result);
          
          if (response.ok) {
            console.log(`✅ ${format.name} works!`);
            return;
          }
        } catch (error) {
          console.log(`❌ ${format.name} failed:`, error);
        }
      }
    } catch (error) {
      console.error('API structure test failed:', error);
    }
  }

    static async processExcelFile(file: File, onProgress?: (progress: ImportProgress) => void): Promise<SalesRecord[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          let text: string;
          
          // Handle different file types
          if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            text = e.target?.result as string;
          } else if (file.type.includes('excel') || file.type.includes('spreadsheet') || 
                     file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            // For Excel files, we'll try to read as text first
            // In a real implementation, you'd use a library like xlsx
            text = e.target?.result as string;
          } else {
            throw new Error('Unsupported file format. Please use CSV or Excel files.');
          }
          
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            throw new Error('Invalid file format. Please use the provided template.');
          }

          // Parse headers - handle both comma and tab separated
          const firstLine = lines[0];
          const isTabSeparated = firstLine.includes('\t');
          const separator = isTabSeparated ? '\t' : ',';
          
          const headers = firstLine.split(separator).map(h => h.trim().toLowerCase());
          
          // Validate headers
          const requiredHeaders = TEMPLATE_COLUMNS.filter(col => col.required).map(col => col.header.toLowerCase());
          const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
          
          if (missingHeaders.length > 0) {
            const error = ErrorHandler.formatValidationErrors([
              `Missing required columns: ${missingHeaders.join(', ')}`
            ]);
            throw error;
          }

          // Process data rows
          const records: SalesRecord[] = [];
          const errors: string[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            try {
              const line = lines[i];
              if (!line.trim()) continue;
              
              const values = line.split(separator).map(v => v.trim());
              const record: Partial<SalesRecord> = {};
              
              // Map values to record
              headers.forEach((header, index) => {
                const value = values[index] || '';
                const column = TEMPLATE_COLUMNS.find(col => col.header.toLowerCase() === header);
                
                if (column) {
                  switch (column.key) {
                    case 'date':
                      if (value) {
                        try {
                          // Handle multiple date formats
                          let parsedDate: Date;
                          
                          // Try different date formats
                          if (value.includes('-')) {
                            const parts = value.split('-');
                            if (parts.length === 3) {
                              // Handle DD-MM-YYYY format (Indian format)
                              if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                                parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                              }
                              // Handle YYYY-MM-DD format
                              else if (parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
                                parsedDate = new Date(value);
                              }
                              // Handle MM-DD-YYYY format
                              else if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                                parsedDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
                              }
                              else {
                                parsedDate = new Date(value);
                              }
                            } else {
                              parsedDate = new Date(value);
                            }
                          }
                          // Handle DD/MM/YYYY format
                          else if (value.includes('/')) {
                            const parts = value.split('/');
                            if (parts.length === 3) {
                              if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                                parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                              } else {
                                parsedDate = new Date(value);
                              }
                            } else {
                              parsedDate = new Date(value);
                            }
                          }
                          // Default to standard Date constructor
                          else {
                            parsedDate = new Date(value);
                          }
                          
                          // Validate the parsed date
                          if (isNaN(parsedDate.getTime())) {
                            throw new Error(`Invalid date format for ${column.header}: ${value}`);
                          }
                          
                          record.date = parsedDate.toISOString();
                        } catch (dateError) {
                          throw new Error(`Invalid date format for ${column.header}: ${value}. Expected formats: DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY`);
                        }
                      }
                      break;
                    case 'plant':
                    case 'materialCode':
                      record[column.key] = value;
                      break;
                    case 'quantity':
                    case 'mrp':
                    case 'discount':
                    case 'gsv':
                    case 'nsv':
                    case 'totalTax':
                      const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
                      if (!isNaN(numValue) && numValue >= 0) {
                        record[column.key] = numValue;
                      } else if (value && isNaN(numValue)) {
                        throw new Error(`Invalid number value for ${column.header}: ${value}`);
                      }
                      break;
                  }
                }
              });
              
              // Validate required fields
              const missingFields = TEMPLATE_COLUMNS
                .filter(col => col.required && !record[col.key])
                .map(col => col.header);
              
              if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
              }
              
              records.push(record as SalesRecord);
              
              // Update progress
              if (onProgress) {
                onProgress({
                  current: i,
                  total: lines.length - 1,
                  percentage: Math.round((i / (lines.length - 1)) * 100),
                  status: 'processing',
                  message: `Processing row ${i} of ${lines.length - 1}`
                });
              }
              
            } catch (rowError) {
              errors.push(`Row ${i + 1}: ${rowError instanceof Error ? rowError.message : 'Invalid data'}`);
            }
          }
          
          if (errors.length > 0) {
            const error = ErrorHandler.formatValidationErrors(errors);
            throw error;
          }
          
          if (records.length === 0) {
            throw new Error('No valid records found in the file');
          }
          
          resolve(records);
          
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

    static async bulkImport(records: SalesRecord[], batchSize: number = 50, onProgress?: (progress: ImportProgress) => void): Promise<void> {
    try {
      const totalBatches = Math.ceil(records.length / batchSize);
      let processedRecords = 0;
      const errors: string[] = [];
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, records.length);
        const batchRecords = records.slice(startIndex, endIndex);
        
        try {
          // Try different API formats based on the error message
          let response;
          let requestBody;
          
          // Format 1: Direct sales records array
          requestBody = {
            salesRecords: batchRecords,
            batchSize: batchRecords.length
          };
          
          response = await fetch(`${API_BASE_URL}/sales/bulk-import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          
          // If that fails, try alternative format
          if (!response.ok) {
            const errorData = await response.json();
            console.log('API Error:', errorData);
            
            // Format 2: With stores/products/items structure
            if (errorData.message && errorData.message.includes('Array field (stores/products/items) is required')) {
              requestBody = {
                stores: batchRecords,
                products: batchRecords,
                items: batchRecords,
                batchSize: batchRecords.length
              };
              
              response = await fetch(`${API_BASE_URL}/sales/bulk-import`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
              });
            }
            
            // Format 3: Just the records array directly
            if (!response.ok) {
              requestBody = batchRecords;
              
              response = await fetch(`${API_BASE_URL}/sales/bulk-import`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
              });
            }
          }
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Batch ${batchIndex + 1} failed`);
          }
          
          processedRecords += batchRecords.length;
          
          // Update progress
          if (onProgress) {
            onProgress({
              current: processedRecords,
              total: records.length,
              percentage: Math.round((processedRecords / records.length) * 100),
              status: 'processing',
              message: `Imported ${processedRecords} of ${records.length} records`
            });
          }
          
        } catch (batchError) {
          errors.push(`Batch ${batchIndex + 1}: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`);
        }
      }
      
      if (errors.length > 0) {
        const error = ErrorHandler.formatValidationErrors(errors);
        throw error;
      }
      
      // Final success progress
      if (onProgress) {
        onProgress({
          current: records.length,
          total: records.length,
          percentage: 100,
          status: 'completed',
          message: `Successfully imported ${records.length} records`
        });
      }
      
    } catch (error) {
      if (onProgress) {
        onProgress({
          current: 0,
          total: records.length,
          percentage: 0,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Import failed',
          errors: error instanceof Error ? [error.message] : ['Unknown error']
        });
      }
      throw error;
    }
  }
} 