const isLocalhostHost = (host = '') => /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
const isNgrokHost = (host = '') => /\.ngrok-free\.dev$/i.test(String(host).split(':')[0] || '');

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

  // Only use same-origin fallback for local development and ngrok tunnels.
  if (!isLocalhostHost(window.location.host) && !isNgrokHost(window.location.host)) {
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
let reconnectTimer = null;
let reconnectAttempts = 0;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;
let idleCloseTimer = null;
let manualCloseRequested = false;

const scheduleReconnect = () => {
  if (reconnectTimer || listeners.size === 0) return;

  const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts, RECONNECT_MAX_MS);
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    reconnectAttempts += 1;
    connectWebSocket();
  }, delay);
};

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const clearIdleCloseTimer = () => {
  if (idleCloseTimer) {
    window.clearTimeout(idleCloseTimer);
    idleCloseTimer = null;
  }
};

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
  manualCloseRequested = false;

  socket.onopen = () => {
    reconnectAttempts = 0;
    clearReconnectTimer();
    if (manualCloseRequested || listeners.size === 0) {
      closeWebSocket();
    }
  };

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
    if (manualCloseRequested) return;
    scheduleReconnect();
  };

  return socket;
};

export const addWebSocketListener = (listener) => {
  listeners.add(listener);
  clearIdleCloseTimer();
  connectWebSocket();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearIdleCloseTimer();
      idleCloseTimer = window.setTimeout(() => {
        idleCloseTimer = null;
        if (listeners.size === 0) {
          closeWebSocket();
        }
      }, 750);
    }
  };
};

export const closeWebSocket = () => {
  manualCloseRequested = true;
  clearIdleCloseTimer();
  clearReconnectTimer();
  reconnectAttempts = 0;
  if (socket) {
    if (socket.readyState === WebSocket.CONNECTING) {
      return;
    }
    socket.close();
    socket = null;
  }
};

export default {
  connectWebSocket,
  addWebSocketListener,
  closeWebSocket,
};