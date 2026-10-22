import {
  CATEGORY_IMAGES,
  SUBSERVICE_IMAGES,
  FALLBACK_SERVICE_IMAGE,
  getCategoryImage,
  getSubServiceImage,
  getServiceImage,
  resolveJobImage,
  getJobImage,
  matchCategoryFromText,
  handleImageFallback,
  normalizeServiceSlug,
  BRAND_LOGO
} from '../constants/serviceImages';

export {
  CATEGORY_IMAGES,
  SUBSERVICE_IMAGES,
  FALLBACK_SERVICE_IMAGE,
  FALLBACK_SERVICE_IMAGE as FALLBACK_CATEGORY_IMAGE,
  getCategoryImage,
  getSubServiceImage,
  getServiceImage,
  resolveJobImage,
  getJobImage,
  matchCategoryFromText,
  handleImageFallback,
  normalizeServiceSlug,
  BRAND_LOGO
};

export const CATEGORY_MEDIA = CATEGORY_IMAGES;

/**
 * Retrieve high-resolution image URL and accessible alt text for any service category object or slug.
 */
export function getCategoryMedia(category) {
  const catObj = getCategoryImage(category);
  return {
    image: catObj.image,
    alt: catObj.alt,
    name: catObj.name,
    slug: catObj.slug
  };
}

/**
 * Retrieve sub-service media with parent-fallback resolution.
 */
export function getSubServiceMedia(category, subservice) {
  const subObj = getSubServiceImage(category, subservice);
  return {
    image: subObj.image,
    alt: subObj.alt,
    name: subObj.name,
    categorySlug: subObj.categorySlug
  };
}

/**
 * Retrieve job media with full hierarchy resolution (subservice -> category -> keyword -> fallback).
 */
export function getJobMedia(job) {
  return resolveJobImage(job);
}
