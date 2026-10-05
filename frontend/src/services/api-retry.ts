/**
 * API Retry Service
 * Provides retry logic with exponential backoff for API calls
 */

interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Retries a fetch call with exponential backoff
 * Retries on network errors or 5xx server errors
 */
export async function fetchWithRetry<T = any>(
  url: string,
  options: RequestInit & { retryOptions?: RetryOptions } = {}
): Promise<Response> {
  const { retryOptions, ...fetchOptions } = options;
  const config = { ...DEFAULT_OPTIONS, ...retryOptions };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      // Don't retry on 4xx errors (except specific cases)
      // Only retry on network errors or 5xx server errors
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // 5xx error - retry
      if (response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        if (attempt < config.maxAttempts) {
          await delay(getBackoffDelay(attempt - 1, config));
          continue;
        }
        return response;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // On the last attempt, throw the error
      if (attempt === config.maxAttempts) {
        throw lastError;
      }

      // Wait before retrying
      await delay(getBackoffDelay(attempt - 1, config));
    }
  }

  throw lastError || new Error('Unknown error during retry');
}

function getBackoffDelay(attemptIndex: number, config: Required<RetryOptions>): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptIndex);
  return Math.min(exponentialDelay, config.maxDelayMs);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
