export interface AppError {
  message: string;
  code?: string;
  details?: string[];
  timestamp: Date;
}

export class ErrorHandler {
  static createError(message: string, code?: string, details?: string[]): AppError {
    return {
      message,
      code,
      details,
      timestamp: new Date()
    };
  }

  static formatApiError(error: any): AppError {
    if (error instanceof Error) {
      return this.createError(error.message);
    }
    
    if (typeof error === 'string') {
      return this.createError(error);
    }
    
    if (error?.message) {
      return this.createError(error.message, error.code, error.details);
    }
    
    return this.createError('An unexpected error occurred');
  }

  static formatValidationErrors(errors: string[]): AppError {
    return this.createError(
      'Validation failed',
      'VALIDATION_ERROR',
      errors
    );
  }

  static formatNetworkError(error: any): AppError {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return this.createError(
        'Network error: Unable to connect to server',
        'NETWORK_ERROR'
      );
    }
    
    return this.formatApiError(error);
  }

  static getErrorMessage(error: AppError | Error | string): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return error.message;
  }

  static getErrorDetails(error: AppError): string[] {
    return error.details || [];
  }

  static isNetworkError(error: any): boolean {
    return error?.code === 'NETWORK_ERROR' || 
           (error instanceof TypeError && error.message.includes('fetch'));
  }

  static isValidationError(error: any): boolean {
    return error?.code === 'VALIDATION_ERROR';
  }

  static logError(error: AppError | Error | string, context?: string): void {
    const errorObj = typeof error === 'string' ? this.createError(error) : error;
    
    console.error(`[${context || 'App'}] Error:`, {
      message: this.getErrorMessage(errorObj),
      code: errorObj instanceof Error ? undefined : errorObj.code,
      details: this.getErrorDetails(errorObj),
      timestamp: errorObj instanceof Error ? new Date() : errorObj.timestamp,
      stack: errorObj instanceof Error ? errorObj.stack : undefined
    });
  }
} 