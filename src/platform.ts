/**
 * Samsung Tizen TV platform layer. Everything degrades to a no-op in a
 * desktop browser (dev server / hosted build), so the same bundle runs on
 * the TV, in the Tizen emulator and in Chrome.
 *
 * Docs: developer.samsung.com/smarttv — Remote Control, TVInputDevice API,
 * Application API.
 */

interface TizenApi {
  tvinputdevice?: {
    registerKey(name: string): void;
    getSupportedKeys(): { name: string; code: number }[];
  };
  application?: { getCurrentApplication(): { exit(): void; hide(): void } };
}

const tizen = (): TizenApi | undefined => (window as unknown as { tizen?: TizenApi }).tizen;

export const isTizen = () => typeof tizen() !== 'undefined';

/**
 * Tizen keyCodes. Arrows/Enter/Back are delivered without registration;
 * every other key must be registered via tvinputdevice (privilege
 * http://tizen.org/privilege/tv.inputdevice in config.xml).
 */
export const TIZEN_KEYS = {
  Back: 10009,
  Exit: 10182, // handled by the system: always closes the app (never intercept)
  MediaPlayPause: 10252,
  MediaPlay: 415,
  MediaPause: 19,
  MediaStop: 413,
  MediaFastForward: 417,
  MediaRewind: 412,
} as const;

/** Keys the app reacts to beyond the mandatory set. Undefined keys stay unregistered (checklist CO-US-01). */
const REGISTERED_KEYS = ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop'];

export function registerTvKeys() {
  const input = tizen()?.tvinputdevice;
  if (!input) return;
  let supported: Set<string>;
  try {
    supported = new Set(input.getSupportedKeys().map((k) => k.name));
  } catch {
    supported = new Set(REGISTERED_KEYS);
  }
  for (const name of REGISTERED_KEYS) {
    if (!supported.has(name)) continue;
    try {
      input.registerKey(name);
    } catch {
      /* key unavailable on this remote */
    }
  }
}

/**
 * Leave the app and return to Smart Hub. Samsung's Return-key rule: Back
 * walks up the screen hierarchy and, on the main screen, closes the app
 * (checklist CO-US-05).
 */
export function exitApp() {
  try {
    tizen()?.application?.getCurrentApplication().exit();
  } catch {
    /* not on a TV */
  }
}

/** Fires when the app goes to the background (Smart Hub, source switch, standby) or returns. */
export function onVisibilityChange(cb: (hidden: boolean) => void) {
  const handler = () => cb(document.hidden);
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}

/** Network connectivity (checklist CO-CN-01/02: notify on loss, recover on reconnect). */
export function onConnectivityChange(cb: (online: boolean) => void) {
  const up = () => cb(true);
  const down = () => cb(false);
  window.addEventListener('online', up);
  window.addEventListener('offline', down);
  return () => {
    window.removeEventListener('online', up);
    window.removeEventListener('offline', down);
  };
}
