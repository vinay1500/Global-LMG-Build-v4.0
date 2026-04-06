export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const textToHtmlParagraph = (value: string) =>
  `<p>${escapeHtml(value).replace(/\n/g, '<br />')}</p>`;
