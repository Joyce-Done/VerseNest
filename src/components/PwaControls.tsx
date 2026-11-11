import { useEffect, useRef, useState } from 'react';

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaControls() {
  const [online, setOnline] = useState(navigator.onLine);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  const [update, setUpdate] = useState<ServiceWorker | null>(null);
  const [refreshReady, setRefreshReady] = useState(false);
  const updating = useRef(false);

  useEffect(() => {
    let alive = true;
    const setConnection = () => setOnline(navigator.onLine);
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    let controlled = Boolean(navigator.serviceWorker?.controller);
    const onController = () => {
      if (updating.current) window.location.reload();
      else { setReady(true); if (controlled) setRefreshReady(true); }
      controlled = true;
    };
    window.addEventListener('online', setConnection);
    window.addEventListener('offline', setConnection);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    const inspectWorker = () => {
      if (!alive || !registration) return;
      if (registration.waiting) setUpdate(registration.waiting);
      if (registration.active) setReady(true);
      if (installing?.state === 'redundant' && !registration.active) setFailed(true);
    };
    const onUpdateFound = () => {
      installing = registration?.installing ?? null;
      installing?.addEventListener('statechange', inspectWorker);
    };
    if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.addEventListener('controllerchange', onController);
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
        if (!alive) return;
        registration = reg;
        inspectWorker();
        reg.addEventListener('updatefound', onUpdateFound);
        onUpdateFound();
        navigator.serviceWorker.ready.then(() => { if (alive) setReady(true); });
      }).catch(error => {
        console.error('VerseNest offline setup failed:', error);
        if (alive) setFailed(true);
      });
    }
    return () => {
      alive = false;
      window.removeEventListener('online', setConnection);
      window.removeEventListener('offline', setConnection);
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
      navigator.serviceWorker?.removeEventListener('controllerchange', onController);
      registration?.removeEventListener('updatefound', onUpdateFound);
      installing?.removeEventListener('statechange', inspectWorker);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally { setInstallPrompt(null); }
  };

  return (
    <aside className="pwa-panel" aria-label="App installation and offline status">
      <div className="pwa-status" role="status" aria-live="polite">
        {failed ? 'Offline setup failed. Reconnect and reload to retry.' : ready ? (online ? 'Ready to use offline' : 'Offline · changes saved on this device') : (online ? 'Preparing offline use…' : 'Offline setup is not complete. Connect once to finish.')}
      </div>
      {(update || refreshReady) && <button className="pwa-button" onClick={() => {
        if (!confirm('Update VerseNest now? Saved verses will stay on this device. Finish any unsaved edits before continuing.')) return;
        updating.current = true;
        if (refreshReady) window.location.reload();
        else update?.postMessage({ type: 'SKIP_WAITING' });
      }}>Update available · Reload</button>}
      {!installed && (
        <details className="pwa-install">
          <summary>Install on your phone</summary>
          <div className="pwa-instructions">
            {installPrompt && <button className="pwa-button" onClick={install}>Install VerseNest</button>}
            <p><strong>iPhone or iPad:</strong> Open this site in Safari, tap Share, then Add to Home Screen. If shown, keep Open as Web App enabled.</p>
            <p><strong>Android:</strong> Open the browser menu and choose Install app or Add to Home screen.</p>
            <p>Open online once and wait for “Ready to use offline.” Profiles and verses stay in this browser on this device. Speech depends on voices available on your phone.</p>
          </div>
        </details>
      )}
    </aside>
  );
}
