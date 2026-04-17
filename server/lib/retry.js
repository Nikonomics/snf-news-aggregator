/**
 * retry.js — Exponential backoff retry with retryable vs fatal error distinction.
 *
 * Fatal errors (400, 401, 403): bad request / auth — retrying won't help.
 * Retryable errors (429, 502, 503, network): transient — worth retrying.
 */

/**
 * Execute fn with exponential backoff retries.
 *
 * @param {() => Promise<any>} fn - The async function to retry
 * @param {object} opts
 * @param {number} opts.maxRetries - default 3
 * @param {number} opts.baseDelayMs - default 1000
 * @returns {Promise<any>}
 * @throws {Error} with .fatal=true if the error is non-retryable
 */
export async function retryWithBackoff(fn, opts = {}) {
  const { maxRetries = 3, baseDelayMs = 1000 } = opts;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status || err.response?.status;
      const isFatal = status === 400 || status === 401 || status === 403;
      if (isFatal || attempt === maxRetries) throw Object.assign(err, { fatal: isFatal });
      // Retryable: 429, 502, 503, timeout, network errors
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
    }
  }
}

export default { retryWithBackoff };
