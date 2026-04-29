import politiquesContent from './politiquesContent.json';

type PolicyDoc = {
  title: string;
  version: string;
  sections: Array<{ title: string; content: string }>;
};

export const POLICIES = politiquesContent as Record<
  'confidentialite' | 'cgu',
  PolicyDoc
>;

export type PolicyId = keyof typeof POLICIES;
