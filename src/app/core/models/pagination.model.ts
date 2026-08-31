// Mirrors DRF's PageNumberPagination (backend/backend/settings.py REST_FRAMEWORK config).
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function emptyPage<T>(): Paginated<T> {
  return { count: 0, next: null, previous: null, results: [] };
}
