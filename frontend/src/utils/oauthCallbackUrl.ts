/** Paramètres OAuth2 renvoyés en query (code flow). */
export function readOAuthReturnFromUrl(href: string): {
  code: string | null;
  state: string | null;
  providerError: string | null;
} {
  const url = new URL(href);
  return {
    code: url.searchParams.get('code'),
    state: url.searchParams.get('state'),
    providerError: url.searchParams.get('error'),
  };
}
