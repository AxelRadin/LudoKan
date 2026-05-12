import { describe, expect, it } from 'vitest';
import { formatPlaytime } from '../../utils/timeUtils';

describe('formatPlaytime', () => {
  it('doit retourner "0min" pour une valeur nulle ou nulle', () => {
    expect(formatPlaytime(null)).toBe('0min');
    expect(formatPlaytime(undefined)).toBe('0min');
    expect(formatPlaytime(0)).toBe('0min');
  });

  it('doit retourner le format "XXmin" pour moins d\'une heure', () => {
    expect(formatPlaytime(0.5)).toBe('30min');
    expect(formatPlaytime(0.1)).toBe('6min');
    expect(formatPlaytime(0.99)).toBe('59min');
  });

  it('doit retourner le format "XhXX" pour une heure ou plus', () => {
    expect(formatPlaytime(1.0)).toBe('1h00');
    expect(formatPlaytime(1.5)).toBe('1h30');
    expect(formatPlaytime(1.08333)).toBe('1h05');
    expect(formatPlaytime(10.1)).toBe('10h06');
    expect(formatPlaytime(100.5)).toBe('100h30');
  });

  it('doit arrondir aux minutes les plus proches', () => {
    expect(formatPlaytime(0.01666)).toBe('1min'); // ~1 min
    expect(formatPlaytime(1.01666)).toBe('1h01'); // ~1h01
  });
});
