import React from 'react';
import { LegalDocumentPage } from '../components/legal/LegalDocumentPage';
import { Seo } from '../components/seo/Seo';
import { LEGAL_DISCLAIMER_DOCUMENT } from '../data/legalContent';
import { buildWebPageJsonLd } from '../seo/jsonLd';

export const LegalDisclaimerPage = () => {
  return (
    <>
      <Seo
        title={LEGAL_DISCLAIMER_DOCUMENT.title}
        description={LEGAL_DISCLAIMER_DOCUMENT.intro}
        path="/legal-disclaimer"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: LEGAL_DISCLAIMER_DOCUMENT.title, path: '/legal-disclaimer' },
        ]}
        structuredData={buildWebPageJsonLd({
          title: LEGAL_DISCLAIMER_DOCUMENT.title,
          description: LEGAL_DISCLAIMER_DOCUMENT.intro,
          path: '/legal-disclaimer',
        })}
      />
      <LegalDocumentPage document={LEGAL_DISCLAIMER_DOCUMENT} />
    </>
  );
};
