/**
 * Keep-Alive Service
 * Prevents backend from sleeping on Render's free tier by periodically pinging the health endpoint
 */

const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes (Render free tier sleeps after 15 min of inactivity)
const HEALTH_CHECK_URL = '/api/healthz';

let pingIntervalId: NodeJS.Timeout | null = null;

export function startKeepAlive(): void {
  // Don't start multiple intervals
  if (pingIntervalId) return;

  // Initial ping immediately
  pingBackend();

  // Set up recurring pings
  pingIntervalId = setInterval(pingBackend, PING_INTERVAL);
}

export function stopKeepAlive(): void {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
}

async function pingBackend(): Promise<void> {
  try {
    const response = await fetch(HEALTH_CHECK_URL, {
      method: 'GET',
      // Use a short timeout to avoid hanging
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`Health check failed with status ${response.status}`);
    }
  } catch (error) {
    // Silently fail - this is just a keep-alive, not critical
    console.debug('Keep-alive ping failed:', error instanceof Error ? error.message : error);
  }
}
