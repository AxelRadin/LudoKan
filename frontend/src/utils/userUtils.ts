/**
 * Identifie si un e-mail est une adresse temporaire générée par l'authentification Steam.
 */
export const isTemporaryEmail = (email?: string | null): boolean => {
  console.log('the email is ', email);
  if (!email) return false;
  return (
    email.endsWith('@steam.ludokan.internal') ||
    email.endsWith('@mailtemporaire.ludokan.internal') ||
    email.endsWith('@mailtemporaire.ludokan.internal')
  );
};
