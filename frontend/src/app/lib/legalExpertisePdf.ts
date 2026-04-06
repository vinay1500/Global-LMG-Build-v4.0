import { BRAND_NAME } from '../config/brand';
import { PRACTICE_AREAS_SOURCE } from '../data/practiceAreas';

export const downloadLegalExpertisePdf = async (): Promise<void> => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  const checkAddPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  const addWrappedText = (
    text: string,
    x: number,
    fontSize: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);

    lines.forEach((line: string) => {
      checkAddPage(lineHeight);
      pdf.text(line, x, yPosition);
      yPosition += lineHeight;
    });
  };

  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(36);
  pdf.text('Legal Expertise', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Comprehensive Practice Areas Guide', pageWidth / 2, pageHeight / 2 + 10, {
    align: 'center',
  });

  pdf.setFontSize(12);
  pdf.text(BRAND_NAME, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });
  pdf.text(
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    pageWidth / 2,
    pageHeight / 2 + 45,
    { align: 'center' }
  );

  pdf.addPage();
  yPosition = margin;

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.text('Table of Contents', margin, yPosition);
  yPosition += 15;

  pdf.setDrawColor(37, 99, 235);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  PRACTICE_AREAS_SOURCE.forEach((category, index) => {
    checkAddPage(8);
    pdf.setTextColor(37, 99, 235);
    pdf.text(`${index + 1}. ${category.category}`, margin + 5, yPosition);
    yPosition += 8;
  });

  PRACTICE_AREAS_SOURCE.forEach((category, catIndex) => {
    pdf.addPage();
    yPosition = margin;

    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, yPosition - 8, pageWidth, 20, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text(`${catIndex + 1}. ${category.category}`, margin, yPosition + 5);
    yPosition += 25;

    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    addWrappedText(category.description, margin, 11, contentWidth, 6);

    yPosition += 8;

    pdf.setDrawColor(37, 99, 235);
    pdf.setLineWidth(0.3);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    checkAddPage(8);
    pdf.text('Expertise Areas:', margin, yPosition);
    yPosition += 10;

    category.items.forEach((item, itemIndex) => {
      const title = item.split(':')[0];
      const description = item.includes(':') ? item.split(':').slice(1).join(':').trim() : '';
      const estimatedSpace = 20 + (description ? 15 : 0);

      checkAddPage(estimatedSpace);

      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPosition - 5, contentWidth, 10, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(37, 99, 235);
      pdf.text(`${itemIndex + 1}. ${title}`, margin + 3, yPosition);
      yPosition += 10;

      if (description) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        const descriptionLines = pdf.splitTextToSize(description, contentWidth - 6);

        descriptionLines.forEach((line: string) => {
          checkAddPage(5);
          pdf.text(line, margin + 6, yPosition);
          yPosition += 5;
        });

        yPosition += 3;
      }

      yPosition += 5;
    });
  });

  const totalPages = pdf.internal.pages.length - 1;
  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
    pdf.setPage(pageNumber);
    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Page ${pageNumber - 1} of ${totalPages - 1}`, pageWidth / 2, pageHeight - 10, {
      align: 'center',
    });
    pdf.text('Legal Expertise Guide | Confidential', margin, pageHeight - 10);
  }

  pdf.save('Legal-Expertise-Comprehensive-Guide.pdf');
};
