import { apiGet, apiPatch } from '../services/api';

export type LibraryPrivacy = {
  is_visible_on_profile: boolean;
  is_visible_to_friends: boolean;
};

export function fetchLibraryPrivacy(): Promise<LibraryPrivacy> {
  return apiGet('/api/me/library-privacy/') as Promise<LibraryPrivacy>;
}

export function patchLibraryPrivacy(
  body: Partial<LibraryPrivacy>
): Promise<LibraryPrivacy> {
  return apiPatch('/api/me/library-privacy/', body) as Promise<LibraryPrivacy>;
}
