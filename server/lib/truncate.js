/**
 * truncate.js — Smart text truncation for AI input preparation.
 * Preserves head and tail of long text to retain context at both ends.
 */

/**
 * Truncate text to maxChars, preserving both the beginning and end.
 * If text fits, returns it as-is. If text is null/undefined, returns ''.
 *
 * @param {string} text
 * @param {number} maxChars - default 4000
 * @returns {string}
 */
export function smartTruncate(text, maxChars = 4000) {
  if (!text || text.length <= maxChars) return text || '';
  const half = Math.floor(maxChars / 2);
  return text.substring(0, half) + ' [...] ' + text.substring(text.length - half);
}

export default { smartTruncate };
