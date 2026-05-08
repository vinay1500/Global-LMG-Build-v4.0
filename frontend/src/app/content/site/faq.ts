// Edit public FAQ copy here when the FAQ route or section is introduced.
// No public FAQ route exists yet; this file is intentionally content-only.

export const FAQ_PAGE_CONTENT = {
  eyebrow: 'FAQ',
  intro:
    'Answers to common questions about Global LMG, the client portal, coordination support, billing, and document workflows.',
  title: 'Frequently Asked Questions',
} as const;

export const FAQ_ITEMS = [
  {
    answer:
      'Global LMG is an intermediary legal consultancy and lawyer-matching platform. We help clients coordinate legal workflows and connect with independently engaged professionals.',
    question: 'Is Global LMG a law firm?',
  },
  {
    answer:
      'No. Public-site content and portal workflows are for coordination and operational support. Clients should rely on qualified counsel for legal advice.',
    question: 'Does Global LMG provide direct legal advice?',
  },
  {
    answer:
      'Sensitive documents should be uploaded only through authenticated portal workflows or another approved secure channel.',
    question: 'How should I share documents?',
  },
];
