import React from 'react';
import { LegalDocumentPage } from '../components/legal/LegalDocumentPage';
import { Seo } from '../components/seo/Seo';
import { REFUND_CANCELLATION_POLICY_DOCUMENT } from '../content/site/legal';
import { buildWebPageJsonLd } from '../seo/jsonLd';

export const RefundCancellationPolicyPage = () => {
  return (
    <>
      <Seo
        title={REFUND_CANCELLATION_POLICY_DOCUMENT.title}
        description={REFUND_CANCELLATION_POLICY_DOCUMENT.intro}
        path="/refund-cancellation"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: REFUND_CANCELLATION_POLICY_DOCUMENT.title, path: '/refund-cancellation' },
        ]}
        structuredData={buildWebPageJsonLd({
          title: REFUND_CANCELLATION_POLICY_DOCUMENT.title,
          description: REFUND_CANCELLATION_POLICY_DOCUMENT.intro,
          path: '/refund-cancellation',
        })}
      />
      <LegalDocumentPage document={REFUND_CANCELLATION_POLICY_DOCUMENT} />
    </>
  );
};
