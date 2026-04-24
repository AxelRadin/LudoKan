import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useFuzzyGames } from '../../hooks/useFuzzyGames';
import Fuse from 'fuse.js';

describe('useFuzzyGames', () => {
  const mockGames = [
    { id: 1, name: 'The Legend of Zelda' },
    { id: 2, name: 'Pokémon Red' },
    { id: 3, name: 'Super Mario Kart 8' },
    { id: 4, name: 'Final Fantasy VII' },
    { id: 5, name: 'Super Smash Bros Melee' },
    { id: 6, name: 'Super Smash Bros' },
  ];

  it('retourne la liste complète sans indices si la requête est vide ou < 2 caractères', () => {
    const { result: res1 } = renderHook(() =>
      useFuzzyGames(mockGames as any, '')
    );
    expect(res1.current).toHaveLength(6);
    expect(res1.current[0].nameIndices).toEqual([]);

    const { result: res2 } = renderHook(() =>
      useFuzzyGames(mockGames as any, 'a')
    );
    expect(res2.current).toHaveLength(6);
    expect(res2.current[0].nameIndices).toEqual([]);
  });

  it('retourne un tableau vide si la liste de jeux initiale est vide', () => {
    const { result } = renderHook(() => useFuzzyGames([], 'Zelda'));
    expect(result.current).toHaveLength(0);
  });

  it('normalise les accents et fait une recherche plein texte (full-phrase)', () => {
    const { result } = renderHook(() =>
      useFuzzyGames(mockGames as any, 'pokemon')
    );
    expect(result.current[0].item.name).toBe('Pokémon Red');
    expect(result.current[0].nameIndices.length).toBeGreaterThan(0);
  });

  it('utilise la recherche par tokens pour des mots séparés (intersection)', () => {
    const { result } = renderHook(() =>
      useFuzzyGames(mockGames as any, 'smash a melee')
    );
    expect(result.current.length).toBeGreaterThanOrEqual(1);
    const match = result.current.find(
      (r: any) => r.item.name === 'Super Smash Bros Melee'
    );
    expect(match).toBeDefined();
    expect(match?.nameIndices.length).toBeGreaterThan(0);
  });

  it('retourne vide si une requête absurde ne correspond à rien (même en mode fuzzy)', () => {
    const { result } = renderHook(() =>
      useFuzzyGames(mockGames as any, 'fifa pes')
    );
    expect(result.current).toHaveLength(0);
  });

  it('gère correctement les espaces multiples et le trimming', () => {
    const { result } = renderHook(() =>
      useFuzzyGames(mockGames as any, '   zelda    ')
    );
    expect(result.current[0].item.name).toBe('The Legend of Zelda');
  });

  it('gère les branches de multi-tokens (rejet partiel, tri forcé des candidats, et doublons)', () => {
    const mockSearch = vi.spyOn(Fuse.prototype, 'search');

    const gameA = { id: 10, name: 'Game A' };
    const gameB = { id: 20, name: 'Game B' };
    const gameC = { id: 30, name: 'Game C' };

    mockSearch.mockReturnValueOnce([
      { item: gameA, score: 0.1, refIndex: 0, matches: [] } as any,
    ]);

    mockSearch.mockReturnValueOnce([
      { item: gameA, score: 0.4, refIndex: 0, matches: [] } as any,
      { item: gameB, score: 0.2, refIndex: 1, matches: [] } as any,
      { item: gameC, score: 0.1, refIndex: 2, matches: [] } as any,
    ]);

    mockSearch.mockReturnValueOnce([
      { item: gameA, score: 0.1, refIndex: 0, matches: [] } as any,
      { item: gameB, score: 0.5, refIndex: 1, matches: [] } as any,
    ]);

    const { result } = renderHook(() =>
      useFuzzyGames([gameA, gameB, gameC] as any, 'mot1 mot2')
    );

    expect(result.current).toHaveLength(2);
    expect(result.current[0].item.id).toBe(10);
    expect(result.current[1].item.id).toBe(20);

    mockSearch.mockRestore();
  });

  it('couvre les fallbacks défensifs inatteignables (Fuse sans score ni matches)', () => {
    vi.spyOn(Fuse.prototype, 'search').mockImplementation(() => {
      return [
        {
          item: { id: 99, name: 'Defensive Fallback Test' } as any,
          refIndex: 0,
          matches: [{ key: 'wrong_key', value: 'test', indices: [] as any }],
        },
      ];
    });

    const testGames = [{ id: 99, name: 'Defensive Fallback Test' }];
    const { result } = renderHook(() =>
      useFuzzyGames(testGames as any, 'fallback test')
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].nameIndices).toEqual([]);

    vi.restoreAllMocks();
  });
});
