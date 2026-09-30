import React, { useEffect, useRef, useState } from 'react';
import { PLAYER_ORIGIN, playerUrl } from '../config';
import { useApp } from '../app/AppContext';
import { mediaCommand, type MediaCommand } from '../remote';
import { onVisibilityChange } from '../platform';
import { Focusable, FocusGroup } from './Focusable';

interface VideoOverlayProps {
  videoId: string;
  title: string;
  onClose: () => void;
}

/**
 * Full-screen YouTube overlay. The player runs inside our relay page
 * (see config.playerUrl) and is driven by postMessage commands. Focus is
 * trapped in the overlay; Return closes it; remote media keys control
 * playback; playback pauses whenever the app is sent to the background
 * (checklist CO-MT-01) and the player is torn down on close.
 */
export const VideoOverlay: React.FC<VideoOverlayProps> = ({ videoId, title, onClose }) => {
  const { s, lang } = useApp();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [failed, setFailed] = useState(false);

  const send = (cmd: MediaCommand) => {
    frameRef.current?.contentWindow?.postMessage({ fifi: cmd }, PLAYER_ORIGIN);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = mediaCommand(e);
      if (!cmd) return;
      e.preventDefault();
      if (cmd === 'stop') {
        send('pause');
        onClose();
      } else {
        send(cmd);
      }
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin === PLAYER_ORIGIN && e.data?.fifi === 'error') setFailed(true);
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('message', onMessage);
    const offVisibility = onVisibilityChange((hidden) => hidden && send('pause'));
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('message', onMessage);
      offVisibility();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FocusGroup focusKey="video-overlay" isFocusBoundary className="absolute inset-0 z-50 bg-black">
      <iframe
        ref={frameRef}
        src={playerUrl(videoId, lang)}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
      />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="max-w-[1100px] text-center text-4xl font-semibold text-white">{s.errorTitle}</p>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-24 pb-14 pt-24">
        <p className="mb-6 line-clamp-1 text-3xl font-semibold text-white text-shadow">{title}</p>
        <FocusGroup focusKey="video-actions" className="flex gap-5">
          <Focusable focusKey="video-toggle" onEnter={() => send('toggle')} className="rounded-2xl">
            {(f) => (
              <span className={`block rounded-2xl px-10 py-4 text-2xl font-bold ${f ? 'bg-tomato text-white' : 'bg-card text-ink'}`}>
                ⏯ {s.playPause}
              </span>
            )}
          </Focusable>
          <Focusable focusKey="video-close" onEnter={onClose} className="rounded-2xl">
            {(f) => (
              <span className={`block rounded-2xl px-10 py-4 text-2xl font-bold ${f ? 'bg-tomato text-white' : 'bg-card text-ink'}`}>
                ✕ {s.close}
              </span>
            )}
          </Focusable>
        </FocusGroup>
      </div>
    </FocusGroup>
  );
};
