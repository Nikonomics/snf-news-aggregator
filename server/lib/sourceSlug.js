/**
 * sourceSlug.js — Canonical source slug normalization.
 * Single implementation imported everywhere. Do NOT reimplement inline.
 */

/**
 * Normalize a source name into a consistent slug.
 * Strips all apostrophe variants, lowercases, replaces non-alphanumeric
 * runs with hyphens, and trims leading/trailing hyphens.
 *
 * @param {string} sourceName
 * @returns {string}
 */
export function normalizeSourceSlug(sourceName) {
  return (sourceName || '')
    .toLowerCase()
    .replace(/[''`\u2018\u2019]/g, '')  // all apostrophe variants
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default { normalizeSourceSlug };
