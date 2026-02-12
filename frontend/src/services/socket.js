import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
  return base.replace(/\/api\/v1\/?$/, '') || 'http://localhost:5000';
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
  const s = io(url, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling']
  });
  socketRef.current = s;
  s.on('connect', () => {
    console.debug('[Socket] Connected for real-time events');
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
