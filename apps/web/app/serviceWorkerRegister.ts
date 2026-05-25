export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('🟢 [PWA/ServiceWorker] Registered successfully:', reg.scope))
        .catch((err) => console.error('🔴 [PWA/ServiceWorker] Registration failed:', err))
    })
  }
}
