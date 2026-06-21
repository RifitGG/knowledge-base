import { useEffect, useRef } from "react";

const LIVE_REFRESH_EVENT = "knowbase:live-refresh";
const LIVE_REFRESH_STORAGE_KEY = "knowbase:live-refresh";

type LiveRefreshPayload = {
  at: number;
  id: string;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function makePayload(): LiveRefreshPayload {
  return {
    at: Date.now(),
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

export function triggerLiveRefresh() {
  if (!isBrowser()) return;
  const payload = makePayload();
  try {
    window.dispatchEvent(new CustomEvent<LiveRefreshPayload>(LIVE_REFRESH_EVENT, { detail: payload }));
  } catch {
    
  }
  try {
    localStorage.setItem(LIVE_REFRESH_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    
  }
}

export function useLiveRefresh(onRefresh: () => void | Promise<void>, enabled = true) {
  const handlerRef = useRef(onRefresh);

  useEffect(() => {
    handlerRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || !isBrowser()) return;

    const run = () => {
      void handlerRef.current();
    };

    const onCustom = () => run();
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LIVE_REFRESH_STORAGE_KEY || !event.newValue) return;
      run();
    };

    window.addEventListener(LIVE_REFRESH_EVENT, onCustom as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(LIVE_REFRESH_EVENT, onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [enabled]);
}
