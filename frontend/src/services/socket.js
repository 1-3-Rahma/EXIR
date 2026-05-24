import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const env = process.env.REACT_APP_API_URL;
  if (!env) return '';
  // Relative API URL → same origin; dev server (setupProxy) or nginx proxies /socket.io.
  if (env.startsWith('/')) return '';
  // Avoid cross-origin ws to :5000 in dev (conflicts with ESP32 raw ws on same port).
  if (process.env.NODE_ENV === 'development') return '';
  return env.replace(/\/api\/v1\/?$/, '') || env;
};

const socketRef = { current: null };

/**
 * Connect socket for real-time events (works for all roles).
 * Events: patientStatusChanged, newNotification, userStatusChanged
 * @param {string} token - JWT token
 * @returns {function} disconnect function
 */
export function connectSocket(token) {
  if (socketRef.current?.connected) return () => socketRef.current.disconnect();
  const url = getSocketUrl();
  // If url is empty, pass no URL so socket.io connects to current origin.
  const s = url ? io(url, {
    path: '/socket.io',
    auth: { token },
    transports: ['polling', 'websocket']
  }) : io({
    path: '/socket.io',
    auth: { token },
    transports: ['polling', 'websocket']
  });
  socketRef.current = s;
  s.on('connect', () => {
    console.debug('[Socket] Connected for real-time events');
    window.dispatchEvent(new CustomEvent('socketConnected', { detail: {} }));
  });
  s.on('disconnect', (reason) => {
    window.dispatchEvent(new CustomEvent('socketDisconnected', { detail: { reason } }));
  });
  s.on('patientStatusChanged', (payload) => {
    window.dispatchEvent(new CustomEvent('patientStatusChanged', { detail: payload }));
  });
  s.on('newNotification', (payload) => {
    window.dispatchEvent(new CustomEvent('newNotification', { detail: payload }));
  });
  s.on('userStatusChanged', (payload) => {
    window.dispatchEvent(new CustomEvent('userStatusChanged', { detail: payload }));
  });
  s.on('newChatMessage', (payload) => {
    window.dispatchEvent(new CustomEvent('newChatMessage', { detail: payload }));
  });
  s.on('chatMessagesRead', (payload) => {
    window.dispatchEvent(new CustomEvent('chatMessagesRead', { detail: payload }));
  });
  s.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });
  return () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };
}

// Backward-compatible alias
export const connectNurseSocket = connectSocket;

export function getSocket() {
  return socketRef.current;
}
