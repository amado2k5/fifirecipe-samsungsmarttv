import React from 'react';
import { Focusable, FocusGroup } from './Focusable';

type Script = 'latin' | 'arabic' | 'hebrew';

export function scriptForLang(lang: string): Script {
  if (lang === 'he') return 'hebrew';
  if (lang === 'ar' || lang === 'fa' || lang === 'ur' || lang === 'ps') return 'arabic';
  return 'latin';
}

const LATIN_ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const ARABIC_ROWS = ['1234567890', 'ضصثقفغعهخحجد', 'شسيبلاتنمكط', 'ئءؤرىةوزظ', 'پچڜگڤ'];
const HEBREW_ROWS = ['1234567890', 'קראטוןםפ', 'שדגכעיחלךף', 'זסבהנמצתץ'];

const ROWS: Record<Script, string[]> = {
  latin: LATIN_ROWS,
  arabic: ARABIC_ROWS,
  hebrew: HEBREW_ROWS,
};

/** Focus key of the first letter key in the second keyboard row (a sane start point). */
export const firstKeyForLang = (lang: string) => `osk-1-${[...ROWS[scriptForLang(lang)][1]][0]}`;

interface KeyboardProps {
  lang: string;
  onChar: (ch: string) => void;
  onBackspace: () => void;
  onSpace: () => void;
  onClear: () => void;
}

/**
 * D-pad keyboard. Every key is a sibling inside one focus group so arrow
 * presses resolve geometrically — down lands on the key actually below, not
 * the start of the next row.
 */
export const OnScreenKeyboard: React.FC<KeyboardProps> = ({ lang, onChar, onBackspace, onSpace, onClear }) => {
  const rows = ROWS[scriptForLang(lang)] ?? LATIN_ROWS;
  const keyCls = (focused: boolean) =>
    `flex items-center justify-center rounded-2xl text-3xl font-bold border-2 ${
      focused
        ? 'bg-leaf text-white border-leaf shadow-lg'
        : 'bg-card text-ink border-card-border shadow-sm'
    }`;
  return (
    <FocusGroup focusKey="osk" className="flex flex-col items-center gap-3">
      {rows.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-3">
          {[...row].map((ch) => (
            <Focusable
              key={ch}
              focusKey={`osk-${ri}-${ch}`}
              onEnter={() => onChar(ch)}
              scroll={false}
              className="rounded-xl"
            >
              {(focused) => (
                <span className={keyCls(focused)} style={{ width: 84, height: 72 }}>
                  {ch}
                </span>
              )}
            </Focusable>
          ))}
        </div>
      ))}
      <div className="mt-2 flex justify-center gap-4">
        <Focusable focusKey="osk-space" onEnter={onSpace} scroll={false} className="rounded-xl">
          {(focused) => (
            <span className={`${keyCls(focused)} px-24 py-4 text-2xl`}>␣</span>
          )}
        </Focusable>
        <Focusable focusKey="osk-bs" onEnter={onBackspace} scroll={false} className="rounded-xl">
          {(focused) => (
            <span className={`${keyCls(focused)} px-12 py-4 text-2xl`}>⌫</span>
          )}
        </Focusable>
        <Focusable focusKey="osk-clear" onEnter={onClear} scroll={false} className="rounded-xl">
          {(focused) => (
            <span className={`${keyCls(focused)} px-12 py-4 text-2xl`}>✕</span>
          )}
        </Focusable>
      </div>
    </FocusGroup>
  );
};
