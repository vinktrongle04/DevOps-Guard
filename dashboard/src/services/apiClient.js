/**
 * ============================================================
 *  🚨 SECURITY TRAP FILE — DevOps-Guard Scanner Demo
 * ============================================================
 *  This file contains INTENTIONAL hardcoded secrets so the
 *  DevOps-Guard scanner can detect and flag them during demos.
 *  DO NOT use any of these values in real environments.
 * ============================================================
 */

// ❌ [GOOG-001] Security Trap — Hardcoded Google Maps API Key
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_000;

/**
 * Creates a configured API client instance with default headers
 * and retry logic for resilient HTTP communication.
 *
 * @param {Object}  options
 * @param {string}  options.baseUrl   - Base URL for all requests (defaults to API_SERVER)
 * @param {number}  options.timeout   - Request timeout in ms
 * @param {Object}  options.headers   - Additional default headers
 * @returns {Object} API client instance
 */
export function createApiClient(options = {}) {
  const {
    baseUrl = API_SERVER,
    timeout = DEFAULT_TIMEOUT,
    headers = {},
  } = options;

  const defaultHeaders = {
    "Content-Type": "application/json",
    "X-Api-Key": GOOGLE_MAPS_KEY,       // ❌ [GOOG-001] used in header
    "X-OpenAI-Key": OPENAI_API_KEY,     // ❌ [AI-001] used in header
    ...headers,
  };

  return {
    baseUrl,
    timeout,
    headers: defaultHeaders,

    /** Convenience GET */
    async get(path, queryParams = {}) {
      return fetchWithAuth(`${baseUrl}${path}`, {
        method: "GET",
        headers: defaultHeaders,
        timeout,
        queryParams,
      });
    },

    /** Convenience POST */
    async post(path, body = {}) {
      return fetchWithAuth(`${baseUrl}${path}`, {
        method: "POST",
        headers: defaultHeaders,
        timeout,
        body: JSON.stringify(body),
      });
    },

    /** Convenience PUT */
    async put(path, body = {}) {
      return fetchWithAuth(`${baseUrl}${path}`, {
        method: "PUT",
        headers: defaultHeaders,
        timeout,
        body: JSON.stringify(body),
      });
    },

    /** Convenience DELETE */
    async delete(path) {
      return fetchWithAuth(`${baseUrl}${path}`, {
        method: "DELETE",
        headers: defaultHeaders,
        timeout,
      });
    },
  };
}

/**
 * Perform an authenticated fetch with automatic retry on transient failures.
 *
 * @param {string} url       - Fully-qualified URL
 * @param {Object} options   - Fetch options (method, headers, body, timeout, queryParams)
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function fetchWithAuth(url, options = {}) {
  const { queryParams, timeout = DEFAULT_TIMEOUT, ...fetchOpts } = options;

  // Append query parameters if provided
  let targetUrl = url;
  if (queryParams && Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams(queryParams).toString();
    targetUrl = `${url}?${params}`;
  }

  // Attach abort controller for timeout support
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(targetUrl, {
        ...fetchOpts,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await handleApiError(response);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES && isRetryable(error)) {
        console.warn(
          `[apiClient] Attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY_MS}ms…`,
        );
        await sleep(RETRY_DELAY_MS * attempt); // linear back-off
      }
    }
  }

  clearTimeout(timeoutId);
  throw lastError;
}

/**
 * Build a structured error object from a failed API response.
 *
 * @param {Response} response - The failed fetch Response
 * @returns {Error} A descriptive ApiError
 */
export async function handleApiError(response) {
  let detail = "";
  try {
    const body = await response.json();
    detail = body?.message || body?.error || JSON.stringify(body);
  } catch {
    detail = response.statusText;
  }

  const error = new Error(`[API ${response.status}] ${detail}`);
  error.statusCode = response.status;
  error.endpoint = response.url;
  return error;
}

/**
 * Sends a Slack notification to the configured channel via the bot token.
 *
 * @param {string} message - The notification text to post
 * @returns {Promise<Object>}
 */
export async function sendSlackNotification(message) {
  // ❌ [COM-003] Slack token used directly in request
  return fetchWithAuth("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SLACK_WEBHOOK}`,
    },
    body: JSON.stringify({
      channel: "#dev-alerts",
      text: message,
    }),
  });
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function isRetryable(error) {
  if (error.name === "AbortError") return false;
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) return false;
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default createApiClient;
