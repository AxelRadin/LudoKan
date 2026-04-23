/** Query string key for persisting the ludothèque filter (e.g. `/profile?libraryStatus=EN_COURS`). */
export const LIBRARY_STATUS_QUERY_KEY = 'libraryStatus';

export type LibraryStatusFilter =
  | 'ALL'
  | 'EN_COURS'
  | 'TERMINE'
  | 'ENVIE_DE_JOUER';

export type LibraryCounts = {
  all: number;
  enCours: number;
  termines: number;
  envie: number;
};

const STATUS_FILTERS: Exclude<LibraryStatusFilter, 'ALL'>[] = [
  'EN_COURS',
  'TERMINE',
  'ENVIE_DE_JOUER',
];

export function parseLibraryStatusParam(
  raw: string | null
): LibraryStatusFilter {
  if (raw == null || raw.trim() === '') return 'ALL';
  const key = raw.trim().toUpperCase().replace(/-/g, '_');
  if (key === 'ALL') return 'ALL';
  if ((STATUS_FILTERS as string[]).includes(key)) {
    return key as Exclude<LibraryStatusFilter, 'ALL'>;
  }
  return 'ALL';
}
