import { describe, it, expect } from 'vitest';
import {
  appendUniqueByReviewId,
  drfNextToApiPath,
  isPaginatedResults,
  normalizePaginatedOrArray,
} from './reviewsPagination';

describe('reviewsPagination', () => {
  it('normalizePaginatedOrArray gère un tableau brut', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    expect(normalizePaginatedOrArray(rows)).toEqual({
      rows,
      totalCount: 2,
      nextUrl: null,
    });
  });

  it('normalizePaginatedOrArray gère une page DRF', () => {
    const data = {
      count: 100,
      next: 'http://localhost:8000/api/reviews/?page=2',
      previous: null,
      results: [{ id: 3 }],
    };
    expect(normalizePaginatedOrArray(data)).toEqual({
      rows: [{ id: 3 }],
      totalCount: 100,
      nextUrl: data.next,
    });
    expect(isPaginatedResults(data)).toBe(true);
  });

  it('drfNextToApiPath extrait path+query', () => {
    expect(drfNextToApiPath('http://host/api/reviews/?page=2')).toBe(
      '/api/reviews/?page=2'
    );
    expect(drfNextToApiPath(null)).toBe(null);
  });

  it('appendUniqueByReviewId évite les doublons', () => {
    expect(appendUniqueByReviewId([{ id: 1 }], [{ id: 1 }, { id: 2 }])).toEqual(
      [{ id: 1 }, { id: 2 }]
    );
  });
});
