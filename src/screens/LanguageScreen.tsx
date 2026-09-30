import React from 'react';
import { useApp } from '../app/AppContext';
import { Focusable, FocusGroup } from '../components/Focusable';

export const LanguageScreen: React.FC = () => {
  const { s, manifest, lang, setLanguage } = useApp();
  return (
    <div className="flex h-full flex-col items-center justify-center pb-10">
      <img src="logo.webp" alt="" className="mb-4 h-28 w-28 object-contain" draggable={false} />
      <h1 className="mb-3 text-5xl font-extrabold text-leaf-deep">{s.appName}</h1>
      <p className="mb-10 text-3xl text-ink-dim">{s.chooseLanguage}</p>
      <FocusGroup focusKey="lang-picker" className="hide-scrollbar max-h-[620px] w-full overflow-y-auto px-2">
        <div className="mx-auto grid w-fit grid-cols-4 gap-6 py-2">
          {manifest.languages.map((l) => (
            <Focusable
              key={l.code}
              focusKey={`lang-${l.code}`}
              onEnter={() => setLanguage(l.code)}
              className="rounded-3xl"
            >
              {(focused) => (
                <div
                  className={`relative flex h-[110px] w-[380px] flex-col items-center justify-center rounded-3xl border-4 ${
                    l.code === lang
                      ? 'border-leaf bg-leaf-soft'
                      : focused
                        ? 'border-card-border bg-card-hover'
                        : 'border-card-border bg-card'
                  }`}
                >
                  {l.code === lang && (
                    <span className="absolute top-3 end-4 text-2xl font-extrabold text-leaf">✓</span>
                  )}
                  <span className="text-3xl font-bold text-ink">{l.nativeName}</span>
                  {l.englishName !== l.nativeName && (
                    <span className="mt-1 text-xl text-ink-dim">{l.englishName}</span>
                  )}
                </div>
              )}
            </Focusable>
          ))}
        </div>
      </FocusGroup>
    </div>
  );
};
