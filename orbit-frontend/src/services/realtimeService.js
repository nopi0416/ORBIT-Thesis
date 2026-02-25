const isLocalhostHost = (host = '') => /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);

const isSafeForCurrentOrigin = (urlString) => {
  try {
    const parsed = new URL(urlString);
    // If app is running on a real domain, don't allow localhost websocket targets.
    if (!isLocalhostHost(window.location.host) && isLocalhostHost(parsed.host)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const buildWsFromApiUrl = (apiUrl) => {
  try {
    const parsed = new URL(apiUrl);
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    parsed.pathname = '/ws';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
};

const getWebSocketUrl = () => {
  const configuredWsUrl = import.meta.env.VITE_WS_URL;
  if (configuredWsUrl && isSafeForCurrentOrigin(configuredWsUrl)) {
    return configuredWsUrl;
  }

  const configuredApiUrl = import.meta.env.VITE_API_URL;
  if (configuredApiUrl) {
    const derivedWsUrl = buildWsFromApiUrl(configuredApiUrl);
    if (derivedWsUrl && isSafeForCurrentOrigin(derivedWsUrl)) {
      return derivedWsUrl;
    }
  }

  // Only use same-origin fallback for local development.
  if (!isLocalhostHost(window.location.host)) {
    return null;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

let socket;
const listeners = new Set();
let lastConnectionAttemptAt = 0;
const CONNECTION_THROTTLE_MS = 5000;
let hasLoggedMissingWsConfig = false;

export const connectWebSocket = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  const wsUrl = getWebSocketUrl();
  if (!wsUrl) {
    if (!hasLoggedMissingWsConfig) {
      console.info('WebSocket disabled: configure VITE_WS_URL (or VITE_API_URL) for production realtime.');
      hasLoggedMissingWsConfig = true;
    }
    return null;
  }

  const now = Date.now();
  if (now - lastConnectionAttemptAt < CONNECTION_THROTTLE_MS) {
    return socket || null;
  }
  lastConnectionAttemptAt = now;

  socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      listeners.forEach((listener) => listener(data));
    } catch (error) {
      console.error('WebSocket parse error:', error);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    socket = null;
  };

  return socket;
};

export const addWebSocketListener = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const closeWebSocket = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
};

export default {
  connectWebSocket,
  addWebSocketListener,
  closeWebSocket,
};