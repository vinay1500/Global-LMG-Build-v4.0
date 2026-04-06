// Detailed expertise item data for expandable cards
export interface ExpertiseItem {
  id: string;
  title: string;
  shortDescription: string;
  fullContent: string;
}

// Helper function to get expertise item by category and ID
export function getExpertiseItem(category: string, itemId: string): ExpertiseItem | undefined {
  const categoryData = EXPERTISE_ITEMS_BY_CATEGORY[category];
  return categoryData?.find((item) => item.id === itemId);
}

// Helper function to get all items for a category
export function getExpertiseItemsByCategory(category: string): ExpertiseItem[] {
  return EXPERTISE_ITEMS_BY_CATEGORY[category] || [];
}

export const EXPERTISE_ITEMS_BY_CATEGORY: Record<string, ExpertiseItem[]> = {
  'Corporate, Commercial and Startups': [
    {
      id: 'contracts-agreements',
      title: 'Contracts and agreements drafting and vetting',
      shortDescription:
        'Comprehensive contract drafting and review services ensuring legal compliance and protecting your business interests across all commercial transactions.',
      fullContent: `
        <h2>Contracts and Agreements Drafting and Vetting</h2>
        <p>Our expert legal team specializes in creating, reviewing, and vetting all types of commercial contracts and agreements. We ensure that your business interests are protected while maintaining enforceability and compliance with applicable laws.</p>
        
        <h3>Our Services Include:</h3>
        <ul>
          <li>Custom contract drafting tailored to your business needs</li>
          <li>Comprehensive contract review and risk assessment</li>
          <li>Negotiation support and clause optimization</li>
          <li>Compliance verification with current regulations</li>
          <li>Amendment and addendum preparation</li>
        </ul>
        
        <h3>Why Choose Our Contract Services?</h3>
        <p>With extensive experience across multiple industries, our lawyers understand the nuances of commercial transactions. We focus on clarity, enforceability, and protecting your interests while facilitating smooth business operations.</p>
      `,
    },
    {
      id: 'influencer-creator-agreements',
      title: 'Influencer/creator agreements',
      shortDescription:
        'Specialized legal support for content creators and influencers navigating brand partnerships, content ownership, and commercial collaborations.',
      fullContent: `
        <h2>Influencer and Creator Agreements</h2>
        <p>The creator economy requires specialized legal expertise. We help influencers, content creators, and brands navigate the complex landscape of digital content agreements.</p>
        
        <h3>Key Services:</h3>
        <ul>
          <li>Influencer-brand collaboration agreements</li>
          <li>Content licensing and usage rights</li>
          <li>Revenue sharing and compensation structures</li>
          <li>Platform-specific terms compliance</li>
          <li>Multi-platform content distribution agreements</li>
        </ul>
        
        <h3>Protection Areas:</h3>
        <ul>
          <li>Intellectual property rights</li>
          <li>Content ownership and licensing</li>
          <li>Performance metrics and deliverables</li>
          <li>Exclusivity and non-compete clauses</li>
          <li>Payment terms and dispute resolution</li>
        </ul>
      `,
    },
    {
      id: 'brand-deals',
      title: 'Brand deals',
      shortDescription:
        'Expert negotiation and structuring of brand partnership agreements ensuring fair terms, proper compensation, and brand protection for all parties.',
      fullContent: `
        <h2>Brand Deals and Partnership Agreements</h2>
        <p>Brand collaborations require careful legal structuring to protect both parties' interests. Our team ensures that brand deals are comprehensive, fair, and legally sound.</p>
        
        <h3>What We Cover:</h3>
        <ul>
          <li>Brand ambassador agreements</li>
          <li>Sponsorship and endorsement deals</li>
          <li>Co-branding and collaboration agreements</li>
          <li>Licensing and merchandising rights</li>
          <li>Performance-based compensation structures</li>
        </ul>
        
        <h3>Key Considerations:</h3>
        <p>We pay special attention to exclusivity provisions, territorial rights, duration terms, and exit clauses to ensure flexibility while maintaining commitment. Our goal is to create win-win partnerships that benefit all stakeholders.</p>
      `,
    },
    {
      id: 'exclusivity-clauses',
      title: 'Exclusivity clauses',
      shortDescription:
        'Strategic drafting and review of exclusivity provisions to balance commitment with flexibility, protecting your freedom while honoring partnership obligations.',
      fullContent: `
        <h2>Exclusivity Clauses</h2>
        <p>Exclusivity provisions can significantly impact your business freedom. We help you understand, negotiate, and structure exclusivity clauses that protect your interests.</p>
        
        <h3>Our Approach:</h3>
        <ul>
          <li>Detailed review of exclusivity scope and duration</li>
          <li>Territorial and market-specific limitations</li>
          <li>Carve-outs for existing and future opportunities</li>
          <li>Fair compensation for exclusivity commitments</li>
          <li>Exit mechanisms and termination rights</li>
        </ul>
        
        <h3>Common Pitfalls We Prevent:</h3>
        <ul>
          <li>Overly broad exclusivity that limits future opportunities</li>
          <li>Perpetual or indefinite exclusivity terms</li>
          <li>Inadequate compensation for exclusivity commitments</li>
          <li>Unclear scope leading to disputes</li>
        </ul>
      `,
    },
    {
      id: 'ip-ownership',
      title: 'IP ownership',
      shortDescription:
        'Clear establishment and protection of intellectual property rights, ensuring proper ownership, licensing, and transfer of creative and proprietary assets.',
      fullContent: `
        <h2>Intellectual Property Ownership</h2>
        <p>Clarity in IP ownership is crucial for protecting your creative and business assets. We ensure proper documentation and protection of all intellectual property rights.</p>
        
        <h3>Services Provided:</h3>
        <ul>
          <li>IP ownership documentation and assignment</li>
          <li>Work-for-hire agreements</li>
          <li>Joint ownership arrangements</li>
          <li>IP transfer and licensing agreements</li>
          <li>Employee and contractor IP provisions</li>
        </ul>
        
        <h3>Protection Strategies:</h3>
        <p>We help establish clear ownership from the outset, whether it's content created by employees, contractors, or through collaborations. Our agreements clearly define ownership, usage rights, and revenue sharing for all IP assets.</p>
      `,
    },
    {
      id: 'contract-vetting',
      title: 'Contract Vetting',
      shortDescription:
        'Comprehensive review of brand collaboration agreements to identify hidden traps, unfavorable terms, and exclusivity or perpetuity clauses that could harm your interests.',
      fullContent: `
        <h2>Contract Vetting for Brand Collaborations</h2>
        <p>Before signing any brand collaboration agreement, thorough legal review is essential. We identify red flags and negotiate better terms to protect your interests.</p>
        
        <h3>What We Review:</h3>
        <ul>
          <li>Exclusivity clauses and their scope</li>
          <li>Perpetuity and long-term commitment terms</li>
          <li>Content ownership and usage rights</li>
          <li>Payment terms and milestone triggers</li>
          <li>Termination rights and penalties</li>
          <li>Indemnification and liability provisions</li>
        </ul>
        
        <h3>Common Traps We Identify:</h3>
        <ul>
          <li>Perpetual content usage rights without additional compensation</li>
          <li>Overly broad exclusivity preventing future opportunities</li>
          <li>One-sided termination rights favoring brands</li>
          <li>Unclear performance metrics leading to payment disputes</li>
          <li>Excessive liability and indemnification obligations</li>
        </ul>
      `,
    },
  ],
  // Add more categories as needed...
};
