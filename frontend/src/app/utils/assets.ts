const LOCAL_UNSPLASH_IMAGE_PREFIX = '/images/unsplash';

const UNSPLASH_ASSET_OVERRIDES: Record<string, string> = {
  // Some historical Unsplash references now return 404s. We remap those ids to
  // existing local stock assets so the site stays fully self-hosted at runtime.
  'photo-1620712943543-bcc4628c7215': 'photo-1551288049-bebda4e38f71',
  'photo-1718873030311-665e717830f3': 'photo-1611974789855-9c2a0a7236a3',
  'photo-1721598418579-6a3f001c4021': 'photo-1486406146926-c627a92ad1ab',
  'photo-1739502759976-1849f579549d': 'photo-1460925895917-afdab827c52f',
};

const LEGACY_REMOTE_PHOTO_ID_PATTERN = /^https?:\/\/[^/]+\/(photo-[^/?]+)/i;

export const selfHostedUnsplashImage = (photoId: string) => {
  const resolvedPhotoId = UNSPLASH_ASSET_OVERRIDES[photoId] ?? photoId;

  return `${LOCAL_UNSPLASH_IMAGE_PREFIX}/${resolvedPhotoId}.jpg`;
};

export const resolveSelfHostedAssetUrl = (src?: string | null) => {
  if (!src) {
    return src ?? undefined;
  }

  if (!src.startsWith('http://') && !src.startsWith('https://')) {
    return src;
  }

  const match = src.match(LEGACY_REMOTE_PHOTO_ID_PATTERN);

  if (!match) {
    return src;
  }

  return selfHostedUnsplashImage(match[1]);
};
