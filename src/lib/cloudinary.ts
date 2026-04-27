/**
 * Cloudinary Transformation Helper
 */

export const getTransformedUrl = (url: string, transformations: string) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  if (url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/${transformations}/`);
  }
  return url;
};

export const getOptimizedMediaUrl = (url: string) => {
  return getTransformedUrl(url, 'f_auto,q_auto');
};

export const getFiltersTransformation = (filters: {
  grayscale: number;
  brightness: number;
  contrast: number;
  sepia: number;
  blur: number;
}) => {
  const parts = [];
  
  if (filters.grayscale > 0) parts.push('e_grayscale');
  if (filters.sepia > 0) parts.push(`e_sepia:${filters.sepia}`);
  if (filters.brightness !== 100) parts.push(`e_brightness:${filters.brightness - 100}`);
  if (filters.contrast !== 100) parts.push(`e_contrast:${filters.contrast - 100}`);
  if (filters.blur > 0) parts.push(`e_blur:${filters.blur * 10}`); // Cloudinary blur is 1-2000

  return parts.join(',');
};

export const deleteCloudinaryMedia = async (publicId: string, resourceType: 'image' | 'video' = 'image') => {
  try {
    const res = await fetch('/api/delete-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId, resourceType })
    });
    return await res.json();
  } catch (error) {
    console.error('Delete media failed:', error);
    return { error: 'Failed to delete media' };
  }
};
