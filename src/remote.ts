import { setKeyMap } from '@noriginmedia/norigin-spatial-navigation';
import { TIZEN_KEYS } from './platform';

/**
 * Remote-control key handling.
 *
 * Samsung remotes deliver standard Arrow keyCodes 37-40 and Enter 13 without
 * registration; Back arrives as keyCode 10009. The laptop arrow-key setup
 * therefore behaves exactly like the TV remote.
 */
export function installKeyMap() {
  setKeyMap({
    left: [37, 'ArrowLeft'],
    up: [38, 'ArrowUp'],
    right: [39, 'ArrowRight'],
    down: [40, 'ArrowDown'],
    enter: [13, 'Enter'],
  });
}

export type BackHandler = () => void;

const BACK_KEYS = new Set(['Escape', 'Backspace', 'BrowserBack', 'GoBack']);
// Tizen Return (10009), plus Backspace/Esc for the desktop/dev build.
const BACK_CODES = new Set([TIZEN_KEYS.Back, 8, 27]);

/** Global back key. Returns an uninstall function. */
export function installBackHandler(onBack: BackHandler) {
  const handler = (e: KeyboardEvent) => {
    const code = e.keyCode || e.which || 0;
    if (BACK_KEYS.has(e.key) || BACK_CODES.has(code)) {
      e.preventDefault();
      onBack();
    }
  };
  window.addEventListener('keydown', handler, true);
  return () => window.removeEventListener('keydown', handler, true);
}

export type MediaCommand = 'toggle' | 'play' | 'pause' | 'stop';

/**
 * Maps remote media keys to player commands: Tizen keyCodes (registered in
 * platform.ts), the W3C key names, and Android's MEDIA_PLAY_PAUSE (85) for
 * desktop/dev parity.
 */
export function mediaCommand(e: KeyboardEvent): MediaCommand | null {
  const code = e.keyCode || e.which || 0;
  if (code === TIZEN_KEYS.MediaPlayPause || code === 85 || e.key === 'MediaPlayPause') return 'toggle';
  if (code === TIZEN_KEYS.MediaPlay || e.key === 'MediaPlay') return 'play';
  if (code === TIZEN_KEYS.MediaPause || e.key === 'MediaPause') return 'pause';
  if (code === TIZEN_KEYS.MediaStop || e.key === 'MediaStop') return 'stop';
  return null;
}
