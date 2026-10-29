/**
 * Central Environment & Network Configuration
 * Supports Local Development, Cloudflare Pages, Cloudflare Tunnel, and Cloud Containers.
 */

// If VITE_API_URL is defined (e.g. in Cloudflare Pages environment variables), use it.
// Otherwise, default gracefully to local development daemon.
const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;

export const API_BASE_URL: string = (
  rawApiUrl && rawApiUrl.trim() !== ''
    ? rawApiUrl.trim().replace(/\/$/, '')
    : 'http://127.0.0.1:8000'
);

// Derive WebSocket URL automatically based on the protocol
export const getWsUrl = (): string => {
  const rawWsUrl = import.meta.env.VITE_WS_URL as string | undefined;
  if (rawWsUrl && rawWsUrl.trim() !== '') {
    return rawWsUrl.trim();
  }

  if (API_BASE_URL.startsWith('https://')) {
    return API_BASE_URL.replace('https://', 'wss://') + '/ws/telemetry';
  }
  if (API_BASE_URL.startsWith('http://')) {
    return API_BASE_URL.replace('http://', 'ws://') + '/ws/telemetry';
  }

  // Fallback relative to current host
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/telemetry`;
  }

  return 'ws://127.0.0.1:8000/ws/telemetry';
};
