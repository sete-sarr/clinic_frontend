export interface SearchResultItem {
  id: number;
  title: string;
  subtitle: string;
  route: string;
  query_params: Record<string, string>;
}

export interface GlobalSearchResults {
  patients: SearchResultItem[];
  doctors: SearchResultItem[];
  appointments: SearchResultItem[];
}

export const EMPTY_SEARCH_RESULTS: GlobalSearchResults = { patients: [], doctors: [], appointments: [] };

export const SEARCH_GROUP_LABELS: Record<keyof GlobalSearchResults, string> = {
  patients: 'Patients',
  doctors: 'Médecins',
  appointments: 'Rendez-vous',
};
