const getWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

let socket;
const listeners = new Set();

export const connectWebSocket = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  socket = new WebSocket(getWebSocketUrl());

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