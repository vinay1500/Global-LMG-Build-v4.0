import React from 'react';
import { LegalDocumentPage } from '../components/legal/LegalDocumentPage';
import { Seo } from '../components/seo/Seo';
import { PRIVACY_POLICY_DOCUMENT } from '../content/site/legal';
import { buildWebPageJsonLd } from '../seo/jsonLd';

export const PrivacyPolicyPage = () => {
  return (
    <>
      <Seo
        title={PRIVACY_POLICY_DOCUMENT.title}
        description={PRIVACY_POLICY_DOCUMENT.intro}
        path="/privacy"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: PRIVACY_POLICY_DOCUMENT.title, path: '/privacy' },
        ]}
        structuredData={buildWebPageJsonLd({
          title: PRIVACY_POLICY_DOCUMENT.title,
          description: PRIVACY_POLICY_DOCUMENT.intro,
          path: '/privacy',
        })}
      />
      <LegalDocumentPage document={PRIVACY_POLICY_DOCUMENT} />
    </>
  );
};
