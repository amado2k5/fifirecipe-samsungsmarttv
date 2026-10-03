import React from 'react';
import { useApp, type Screen } from '../app/AppContext';
import { Focusable, FocusGroup } from './Focusable';

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chapters: (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2.4}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" strokeLinecap="round" />
    </svg>
  ),
  kids: (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="10" r="6" />
      <path d="M9.5 9h.01M14.5 9h.01M9 12.5c.8.8 5.2.8 6 0M12 16v4M8 20h8" strokeLinecap="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" strokeLinecap="round" />
    </svg>
  ),
};

const TABS: { id: string; labelKey: 'home' | 'chapters' | 'search' | 'kids' | 'settings'; screen: Screen }[] = [
  { id: 'home', labelKey: 'home', screen: { name: 'home' } },
  { id: 'chapters', labelKey: 'chapters', screen: { name: 'chapters' } },
  { id: 'search', labelKey: 'search', screen: { name: 'search' } },
  { id: 'kids', labelKey: 'kids', screen: { name: 'kids' } },
  { id: 'settings', labelKey: 'settings', screen: { name: 'settings' } },
];

interface TopNavProps {
  active: string;
}

export const TopNav: React.FC<TopNavProps> = ({ active }) => {
  const { s, goTab, data } = useApp();
  const tabs = TABS.filter((t) => t.id !== 'kids' || data.kids.size > 0);
  return (
    <FocusGroup focusKey={`topnav-${active}`} className="flex items-center gap-3 mb-6" saveLastFocusedChild={false}>
      <img src="logo.webp" alt="" className="me-3 h-16 w-16 object-contain" draggable={false} />
      <span className="me-6 text-3xl font-extrabold text-leaf-deep">{s.appName}</span>
      {tabs.map((t) => (
        <Focusable
          key={t.id}
          focusKey={`nav-${t.id}`}
          onEnter={() => goTab(t.screen)}
          scroll={false}
          className="rounded-full"
        >
          {(focused) => (
            <span
              className={`flex items-center gap-2.5 rounded-full px-7 py-3 text-[26px] font-bold transition-colors border-2 ${
                active === t.id
                  ? 'bg-leaf text-white border-leaf shadow-md'
                  : focused
                    ? 'bg-card-hover text-ink border-card-border'
                    : 'bg-card text-ink-dim border-card-border'
              }`}
            >
              {ICONS[t.id]}
              <span>{s[t.labelKey]}</span>
            </span>
          )}
        </Focusable>
      ))}
    </FocusGroup>
  );
};
