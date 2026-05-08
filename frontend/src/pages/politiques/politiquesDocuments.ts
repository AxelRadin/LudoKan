import politiquesContentFr from './politiquesContent.json';
import politiquesContentEn from './politiquesContent.en.json';
import i18n from '../../i18n';

type PolicyDoc = {
  title: string;
  version: string;
  sections: Array<{ title: string; content: string }>;
};

type PoliciesRecord = Record<'confidentialite' | 'cgu', PolicyDoc>;

export function getPolicies(): PoliciesRecord {
  return (
    i18n.language === 'en' ? politiquesContentEn : politiquesContentFr
  ) as PoliciesRecord;
}

export const POLICIES = politiquesContentFr as PoliciesRecord;
export type PolicyId = keyof PoliciesRecord;
