import { apiGet } from '../services/api';
import type { NormalizedGame } from '../types/game';

export async function fetchRecommendations(): Promise<NormalizedGame[]> {
  return apiGet('/api/recommendations/');
}
