const STORAGE_KEY = 'classpulse-notifications';
const CHANGE_EVENT = 'classpulse-notifications-change';

const safeRead = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const write = (notifications) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const readNotifications = () => safeRead();

export const addNotification = ({ title, detail, to = '/', type = 'info', dedupeKey = '' }) => {
  const notifications = safeRead();
  const now = new Date().toISOString();
  const existingIndex = dedupeKey
    ? notifications.findIndex((notification) => notification.dedupeKey === dedupeKey)
    : -1;
  const next = {
    id: existingIndex >= 0 ? notifications[existingIndex].id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    detail,
    to,
    type,
    dedupeKey,
    read: false,
    createdAt: now
  };

  if (existingIndex >= 0) {
    notifications.splice(existingIndex, 1);
  }

  write([next, ...notifications]);
  return next;
};

export const markNotificationRead = (id) => {
  write(safeRead().map((notification) =>
    notification.id === id ? { ...notification, read: true } : notification
  ));
};

export const markAllNotificationsRead = () => {
  write(safeRead().map((notification) => ({ ...notification, read: true })));
};

export const clearNotifications = () => write([]);

export const onNotificationsChange = (callback) => {
  const handler = () => callback(safeRead());
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
};
