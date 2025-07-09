import { API_BASE_URL } from '@/shared/data/utilities/api';
import { ErrorHandler } from '@/shared/utils/errorHandler';
import * as XLSX from 'xlsx';

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
          let workbook: XLSX.WorkBook;
          let isExcel = false;
          if (
            file.type.includes('excel') ||
            file.type.includes('spreadsheet') ||
            file.name.endsWith('.xlsx') ||
            file.name.endsWith('.xls')
          ) {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            workbook = XLSX.read(data, { type: 'array' });
            isExcel = true;
          }
          let sheetName = '';
          let sheetNames: string[] = [];
          let sheet: XLSX.WorkSheet | undefined;
          if (isExcel) {
            sheetNames = workbook.SheetNames;
            sheetName = sheetNames.find(
              (name) => name.trim().toLowerCase() === 'sale'
            ) || '';
            if (!sheetName) {
              reject(new Error("'Sale' sheet not found in the Excel file"));
              return;
            }
            sheet = workbook.Sheets[sheetName];
            if (!sheet) {
              reject(new Error("'Sale' sheet is missing in the Excel file"));
              return;
            }
          } else {
            reject(new Error('Unsupported file format. Please use Excel files (.xlsx, .xls) for import.'));
            return;
          }
          // Parse sheet to JSON
          const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (rawRows.length < 2) {
            reject(new Error('The "Sale" sheet is empty or missing headers.'));
            return;
          }
          // Map columns (case-insensitive, pick first for duplicates)
          const headerRow = rawRows[0].map((h: any) => (h ? h.toString().trim() : ''));
          const lowerHeaders = headerRow.map((h: string) => h.toLowerCase());
          // Required columns (case-insensitive)
          const requiredCols = [
            'calendar year/month',
            'calendar day',
            'plant',
            'division',
            'matl group',
            'material',
            'qty',
            'mrp',
            'discount',
            'gsv',
            'nsv',
            'total tax',
          ];
          const colIndexes: Record<string, number> = {};
          for (const col of requiredCols) {
            const idx = lowerHeaders.findIndex((h) => h === col.toLowerCase());
            if (idx === -1) {
              reject(new Error(`Missing required column: ${col}`));
              return;
            }
            if (!(col in colIndexes)) colIndexes[col] = idx; // pick first occurrence
          }
          // Parse data rows
          const records: SalesRecord[] = [];
          const errors: string[] = [];
          for (let i = 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0 || row.every((cell: any) => !cell || cell.toString().trim() === '')) continue;
            try {
              // Map columns
              const plant = row[colIndexes['plant']]?.toString().trim() || '';
              const materialCode = row[colIndexes['material']]?.toString().trim() || '';
              const quantity = parseFloat(row[colIndexes['qty']]?.toString().replace(/[^\d.-]/g, '') || '0');
              const mrp = parseFloat(row[colIndexes['mrp']]?.toString().replace(/[^\d.-]/g, '') || '0');
              const discount = parseFloat(row[colIndexes['discount']]?.toString().replace(/[^\d.-]/g, '') || '0');
              const gsv = parseFloat(row[colIndexes['gsv']]?.toString().replace(/[^\d.-]/g, '') || '0');
              const nsv = parseFloat(row[colIndexes['nsv']]?.toString().replace(/[^\d.-]/g, '') || '0');
              const totalTax = parseFloat(row[colIndexes['total tax']]?.toString().replace(/[^\d.-]/g, '') || '0');
              // Calendar Day conversion
              let date = row[colIndexes['calendar day']]?.toString().trim() || '';
              if (date) {
                // Convert DD.MM.YYYY to ISO
                if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
                  const [dd, mm, yyyy] = date.split('.');
                  date = new Date(`${yyyy}-${mm}-${dd}`).toISOString();
                } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                  date = new Date(date).toISOString();
                } else {
                  // fallback: try Date constructor
                  const d = new Date(date);
                  if (!isNaN(d.getTime())) date = d.toISOString();
                  else throw new Error(`Invalid date format: ${row[colIndexes['calendar day']]}`);
                }
              }
              // Validate required fields
              if (!plant || !materialCode || isNaN(quantity) || isNaN(mrp) || isNaN(gsv) || isNaN(nsv)) {
                throw new Error('Missing or invalid required fields');
              }
              records.push({
                plant,
                materialCode,
                quantity,
                mrp,
                discount: isNaN(discount) ? undefined : discount,
                gsv,
                nsv,
                totalTax: isNaN(totalTax) ? undefined : totalTax,
                date,
              });
              if (onProgress) {
                onProgress({
                  current: i,
                  total: rawRows.length - 1,
                  percentage: Math.round((i / (rawRows.length - 1)) * 100),
                  status: 'processing',
                  message: `Processing row ${i} of ${rawRows.length - 1}`,
                });
              }
            } catch (err: any) {
              errors.push(`Row ${i + 1}: ${err.message || 'Invalid data'}`);
            }
          }
          if (errors.length > 0) {
            reject(new Error(errors.join('\n')));
            return;
          }
          if (records.length === 0) {
            reject(new Error('No valid records found in the "Sale" sheet'));
            return;
          }
          resolve(records);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
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