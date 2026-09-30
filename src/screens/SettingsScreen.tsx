import React from 'react';
import { useApp } from '../app/AppContext';
import { Focusable, FocusGroup } from '../components/Focusable';
import { TopNav } from '../components/TopNav';

export const SETTINGS_DEFAULT_FOCUS = 'set-language';

const IconChip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="me-5 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-leaf-soft text-leaf-deep">
    {children}
  </span>
);

export const SettingsScreen: React.FC = () => {
  const { s, langInfo, manifest, navigate } = useApp();
  return (
    <div className="fade-in flex h-full flex-col">
      <TopNav active="settings" />
      <FocusGroup focusKey="settings" className="hide-scrollbar min-h-0 flex-1 overflow-y-auto pb-16">
        <div className="flex max-w-4xl flex-col gap-6 py-4">
          <Focusable focusKey={SETTINGS_DEFAULT_FOCUS} onEnter={() => navigate({ name: 'language' })} className="rounded-3xl">
            {(f) => (
              <div
                className={`flex items-center justify-between rounded-3xl border-2 p-6 ${
                  f ? 'border-card-border bg-card-hover' : 'border-card-border bg-card'
                }`}
              >
                <span className="flex items-center text-3xl font-bold text-ink">
                  <IconChip>
                    <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18M12 3c2.5 2.6 4 5.7 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.7-4-9s1.5-6.4 4-9z" />
                    </svg>
                  </IconChip>
                  {s.language}
                </span>
                <span className="text-2xl font-semibold text-leaf-deep">
                  {langInfo ? `${langInfo.nativeName} (${langInfo.englishName})` : ''}
                </span>
              </div>
            )}
          </Focusable>

          <Focusable focusKey="set-about" isStatic className="rounded-3xl">
            <div className="flex items-start rounded-3xl border-2 border-card-border bg-card p-6">
              <IconChip>
                <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 10.5V17M12 7.5v.01" strokeLinecap="round" />
                </svg>
              </IconChip>
              <div>
                <span className="text-3xl font-bold text-ink">{s.about}</span>
                <p className="mt-3 text-[26px] leading-relaxed text-ink-dim">{s.aboutText}</p>
              </div>
            </div>
          </Focusable>

          <Focusable focusKey="set-version" isStatic className="rounded-3xl">
            <div className="flex items-center justify-between rounded-3xl border-2 border-card-border bg-card p-6">
              <span className="flex items-center text-3xl font-bold text-ink">
                <IconChip>
                  <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" strokeLinejoin="round" />
                    <path d="M12 12.5 4.5 8.7M12 12.5l7.5-3.8M12 12.5V20" />
                  </svg>
                </IconChip>
                {s.version}
              </span>
              <span className="text-2xl text-ink-dim">fifi.cooking · {manifest.version}</span>
            </div>
          </Focusable>
        </div>
      </FocusGroup>
    </div>
  );
};
