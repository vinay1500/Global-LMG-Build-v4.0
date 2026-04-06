export const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

export const getTitleFromLabeledText = (value: string) => {
  return value.split(':')[0].trim();
};

export const getDescriptionFromLabeledText = (value: string) => {
  return value.includes(':') ? value.split(':').slice(1).join(':').trim() : '';
};

export const matchesSlugOrTitle = (value: string, ...candidates: Array<string | undefined>) => {
  return candidates.some((candidate) => {
    if (!candidate) {
      return false;
    }

    return candidate === value || slugify(candidate) === slugify(value);
  });
};
