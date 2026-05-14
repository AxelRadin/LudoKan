import { apiGet } from '../services/api';
import type { NormalizedGame } from '../types/game';

export async function fetchRecommendations(): Promise<NormalizedGame[]> {
  const data = await apiGet('/api/recommendations/');
  return Array.isArray(data) ? data : [];
}
