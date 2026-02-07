import { WebSocketServer } from 'ws';

let wss;

export const initWebSocketServer = (server) => {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.send(
      JSON.stringify({
        event: 'connected',
        payload: { message: 'WebSocket connected' },
        timestamp: new Date().toISOString(),
      })
    );
  });

  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((socket) => {
      if (!socket.isAlive) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
};

export const broadcast = (event, payload = {}) => {
  if (!wss) return;
  const message = JSON.stringify({
    event,
    payload,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((socket) => {
    if (socket.readyState === 1) {
      socket.send(message);
    }
  });
};

export default {
  initWebSocketServer,
  broadcast,
};