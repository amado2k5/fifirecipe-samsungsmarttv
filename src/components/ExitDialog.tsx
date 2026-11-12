import React, { useEffect } from 'react';
import { doesFocusableExist, getCurrentFocusKey, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import type { UIStrings } from '../i18n/strings';
import { Focusable, FocusGroup } from './Focusable';

interface ExitDialogProps {
  s: UIStrings;
  /** The user chose Exit — the only path that may terminate the app. */
  onExit: () => void;
  /** Cancel, or Return while the popup is open. */
  onCancel: () => void;
}

/**
 * Exit confirmation popup (Samsung Return-key policy / "Terminating
 * Applications" guide): Return on the main screen opens this HTML popup and
 * the app terminates only when the user confirms. Focus is trapped inside,
 * starts on Cancel so a repeated OK/Return never exits by accident, and goes
 * back to the element that had it once the popup closes.
 */
export const ExitDialog: React.FC<ExitDialogProps> = ({ s, onExit, onCancel }) => {
  useEffect(() => {
    const previous = getCurrentFocusKey();
    setFocus('exit-no');
    return () => {
      if (previous && doesFocusableExist(previous)) setFocus(previous);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="exit-dialog-title"
    >
      <FocusGroup
        focusKey="exit-dialog"
        isFocusBoundary
        saveLastFocusedChild={false}
        preferredChildFocusKey="exit-no"
        className="rounded-[2.5rem] bg-paper px-20 py-16 text-center shadow-2xl"
      >
        <h2 id="exit-dialog-title" className="mb-12 text-5xl font-extrabold text-ink">
          {s.exitPrompt}
        </h2>
        <FocusGroup focusKey="exit-actions" saveLastFocusedChild={false} className="flex justify-center gap-8">
          <Focusable focusKey="exit-no" onEnter={onCancel} scroll={false} className="rounded-2xl">
            {(f) => (
              <span className={`block rounded-2xl px-14 py-5 text-3xl font-extrabold ${f ? 'bg-leaf text-white' : 'bg-card text-ink'}`}>
                {s.exitNo}
              </span>
            )}
          </Focusable>
          <Focusable focusKey="exit-yes" onEnter={onExit} scroll={false} className="rounded-2xl">
            {(f) => (
              <span className={`block rounded-2xl px-14 py-5 text-3xl font-extrabold ${f ? 'bg-tomato text-white' : 'bg-card text-ink'}`}>
                {s.exitYes}
              </span>
            )}
          </Focusable>
        </FocusGroup>
      </FocusGroup>
    </div>
  );
};
