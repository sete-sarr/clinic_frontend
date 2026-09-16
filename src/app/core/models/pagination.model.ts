// Reflète le PageNumberPagination de DRF (config REST_FRAMEWORK de backend/backend/settings.py).
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function emptyPage<T>(): Paginated<T> {
  return { count: 0, next: null, previous: null, results: [] };
}
