import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
  return base.replace(/\/api\/v1\/?$/, '') || 'http://localhost:5000';
};

const socketRef = { current: null };

/**
 * Connect nurse socket for real-time patient status updates.
 * When doctor changes patient status (stable/critical), server emits 'patientStatusChanged';
 * we dispatch a custom event so nurse pages can refetch immediately without refresh.
 * @param {string} token - JWT token
 * @returns {function} disconnect function
 */
export function connectNurseSocket(token) {
  if (socketRef.current?.connected) return () => socketRef.current.disconnect();
  const url = getSocketUrl();
  const s = io(url, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling']
  });
  socketRef.current = s;
  s.on('connect', () => {
    console.debug('[Socket] Nurse connected for real-time alerts');
  });
  s.on('patientStatusChanged', (payload) => {
    window.dispatchEvent(new CustomEvent('patientStatusChanged', { detail: payload }));
  });
  s.on('newNotification', (payload) => {
    window.dispatchEvent(new CustomEvent('newNotification', { detail: payload }));
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

export function getSocket() {
  return socketRef.current;
}
