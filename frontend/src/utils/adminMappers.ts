import type { AdminEntityPick } from '../types/adminReviews';

type UnknownRecord = Record<string, unknown>;

export function isRecord(x: unknown): x is UnknownRecord {
  return typeof x === 'object' && x !== null;
}

export function userPick(row: unknown): AdminEntityPick | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  if (typeof id !== 'number') return null;
  const pseudo = row.pseudo;
  const email = row.email;
  let label = '';
  if (typeof pseudo === 'string' && pseudo.trim()) label = pseudo;
  if (typeof email === 'string' && email.trim()) {
    label = label ? `${label} (${email})` : email;
  }
  if (!label) label = `#${id}`;
  return { id, label };
}

export function gamePick(row: unknown): AdminEntityPick | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  if (typeof id !== 'number') return null;
  const name = row.name;
  const label = typeof name === 'string' && name.trim() ? name : `#${id}`;
  return { id, label };
}
