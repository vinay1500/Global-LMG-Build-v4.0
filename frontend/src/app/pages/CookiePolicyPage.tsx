import React from 'react';
import { LegalDocumentPage } from '../components/legal/LegalDocumentPage';
import { Seo } from '../components/seo/Seo';
import { COOKIE_POLICY_DOCUMENT } from '../data/legalContent';
import { buildWebPageJsonLd } from '../seo/jsonLd';

export const CookiePolicyPage = () => {
  return (
    <>
      <Seo
        title={COOKIE_POLICY_DOCUMENT.title}
        description={COOKIE_POLICY_DOCUMENT.intro}
        path="/cookies"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: COOKIE_POLICY_DOCUMENT.title, path: '/cookies' },
        ]}
        structuredData={buildWebPageJsonLd({
          title: COOKIE_POLICY_DOCUMENT.title,
          description: COOKIE_POLICY_DOCUMENT.intro,
          path: '/cookies',
        })}
      />
      <LegalDocumentPage document={COOKIE_POLICY_DOCUMENT} />
    </>
  );
};
