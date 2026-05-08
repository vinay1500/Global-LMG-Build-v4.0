import React from 'react';
import { LegalDocumentPage } from '../components/legal/LegalDocumentPage';
import { Seo } from '../components/seo/Seo';
import { TERMS_OF_SERVICE_DOCUMENT } from '../content/site/legal';
import { buildWebPageJsonLd } from '../seo/jsonLd';

export const TermsOfServicePage = () => {
  return (
    <>
      <Seo
        title={TERMS_OF_SERVICE_DOCUMENT.title}
        description={TERMS_OF_SERVICE_DOCUMENT.intro}
        path="/terms"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: TERMS_OF_SERVICE_DOCUMENT.title, path: '/terms' },
        ]}
        structuredData={buildWebPageJsonLd({
          title: TERMS_OF_SERVICE_DOCUMENT.title,
          description: TERMS_OF_SERVICE_DOCUMENT.intro,
          path: '/terms',
        })}
      />
      <LegalDocumentPage document={TERMS_OF_SERVICE_DOCUMENT} />
    </>
  );
};
