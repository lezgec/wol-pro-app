import { useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { tourSteps } from './tourSteps';

export function useAppTour(identity: string | null, eligible: boolean) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [loadedIdentity, setLoadedIdentity] = useState<string | null>(null);
  const key = useRef<string | null>(null), unseen = useRef(false), completed = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let cancelled = false;
    key.current = null; unseen.current = false; completed.current = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setVisible(false); setIndex(0); setLoadedIdentity(null);
      if (!identity) return;
      try {
        const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, identity);
        const storageKey = `wolpro.tour.v1.${hash}`;
        const stored = await SecureStore.getItemAsync(storageKey);
        if (cancelled) return;
        key.current = storageKey;
        let saved: { index?: number; completed?: boolean } | null = null;
        try { saved = stored ? JSON.parse(stored) : null; } catch { /* Ignore damaged optional preference. */ }
        completed.current = saved?.completed === true;
        const position = saved?.index;
        setIndex(!completed.current && typeof position === 'number' && Number.isInteger(position) && position >= 0 && position < tourSteps.length ? position : 0);
        unseen.current = stored === null;
      } catch { /* Optional help remains manually available. */ }
      if (!cancelled) setLoadedIdentity(identity);
    })();
    return () => { cancelled = true; };
  }, [identity]);
  function save(position: number, done = false) {
    completed.current = done;
    if (key.current) {
      const storageKey = key.current;
      const value = JSON.stringify({ index: position, completed: done });
      writes.current = writes.current.then(() => SecureStore.setItemAsync(storageKey, value)).catch(() => undefined);
    }
  }
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled && eligible && identity && loadedIdentity === identity && unseen.current) {
        unseen.current = false; setVisible(true);
        if (key.current) {
          const storageKey = key.current;
          writes.current = writes.current.then(() => SecureStore.setItemAsync(storageKey, JSON.stringify({ index: 0, completed: false }))).catch(() => undefined);
        }
      }
    });
    return () => { cancelled = true; };
  }, [eligible, identity, loadedIdentity]);
  return {
    visible: visible && eligible && loadedIdentity === identity,
    active: visible && loadedIdentity === identity,
    index,
    start() { if (identity && loadedIdentity === identity) { const position = completed.current ? 0 : index; setIndex(position); unseen.current = false; setVisible(true); save(position); } },
    close() { setVisible(false); save(index); },
    move(position: number) { if (position >= 0 && position < tourSteps.length) { setIndex(position); save(position); } },
    finish() { setVisible(false); setIndex(0); save(0, true); },
  };
}
