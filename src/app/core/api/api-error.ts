import { HttpErrorResponse } from '@angular/common/http';

// Mirrors common.exceptions.api_exception_handler (docs/api-guidelines.md
// "Standardized errors: code, message, field when relevant").
export interface ApiError {
  code: number;
  message: string;
  field: string | null;
}

function isApiErrorShape(value: unknown): value is ApiError {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>)['message'] === 'string'
  );
}

export function parseApiError(error: unknown, fallbackMessage: string): ApiError {
  if (error instanceof HttpErrorResponse && isApiErrorShape(error.error)) {
    return error.error;
  }
  const code = error instanceof HttpErrorResponse ? error.status : 0;
  return { code, message: fallbackMessage, field: null };
}
