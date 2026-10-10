const KEY = 'motory_access_token';
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}
export function getAccessToken() {
  return localStorage.getItem(KEY);
}
export function setAccessToken(token: string) {
  localStorage.setItem(KEY, token);
  notify();
}
export function clearAccessToken() {
  localStorage.removeItem(KEY);
  notify();
}
export function subscribeToToken(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
