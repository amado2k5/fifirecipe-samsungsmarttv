import React, { useEffect, useMemo, useState } from 'react';
import { getCurrentFocusKey, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { api } from '../api/client';
import { useApp } from '../app/AppContext';
import { firstKeyForLang, OnScreenKeyboard } from '../components/Keyboard';
import { RecipeCardView } from '../components/Cards';
import { FocusGroup } from '../components/Focusable';
import { TopNav } from '../components/TopNav';

const MAX_RESULTS = 48;

export const SEARCH_DEFAULT_FOCUS = 'osk-1-auto';

export const SearchScreen: React.FC = () => {
  const { s, lang, data, navigate } = useApp();
  const [query, setQuery] = useState('');
  const [haystack, setHaystack] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .search(lang)
      .then((h) => alive && setHaystack(h))
      .catch(() => alive && setHaystack({}));
    return () => {
      alive = false;
    };
  }, [lang]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !haystack) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    const out: string[] = [];
    for (const [id, text] of Object.entries(haystack)) {
      if (terms.every((t) => text.includes(t)) && data.index.has(id)) {
        out.push(id);
        if (out.length >= MAX_RESULTS) break;
      }
    }
    return out;
  }, [query, haystack, data.index]);

  // When the focused result card unmounts (query edited/cleared), the engine's
  // auto-restore can land on the bare search-results group — an invisible
  // focus with no left/right escape. Push it back to the keyboard instead.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (getCurrentFocusKey() === 'search-results') {
        setFocus(firstKeyForLang(lang));
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [results, lang]);

  return (
    <div className="flex h-full flex-col">
      <TopNav active="search" />
      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto pb-16">
        <div className="mb-6 flex items-center gap-5 rounded-3xl border-2 border-card-border bg-card px-8 py-5 shadow-sm">
          <svg viewBox="0 0 24 24" width={38} height={38} fill="none" stroke="#4d9426" strokeWidth={2.4} className="shrink-0">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 21 21" strokeLinecap="round" />
          </svg>
          <div className="min-w-0">
            <p className="text-xl text-ink-dim">{s.searchHint}</p>
            <p className="mt-1 min-h-[52px] text-4xl font-bold tracking-wide text-ink">
              {query || <span className="text-ink-dim/60">{s.searchTitle}…</span>}
              <span className="ms-1 inline-block h-9 w-1.5 animate-pulse rounded bg-leaf align-middle" />
            </p>
          </div>
        </div>

        <OnScreenKeyboard
          lang={lang}
          onChar={(ch) => setQuery((q) => q + ch)}
          onBackspace={() => setQuery((q) => [...q].slice(0, -1).join(''))}
          onSpace={() => setQuery((q) => (q.endsWith(' ') || !q ? q : q + ' '))}
          onClear={() => setQuery('')}
        />

        {query.trim() && results.length === 0 ? (
          <h2 className="mt-10 mb-4 px-1 text-3xl font-bold">{s.noResults}</h2>
        ) : (
          <FocusGroup focusKey="search-results" className="mt-10">
            {query.trim() && (
              <h2 className="mb-4 px-1 text-3xl font-bold">
                {s.resultsFor} “{query.trim()}”
              </h2>
            )}
            <div className="grid grid-cols-5 gap-6 py-2">
              {results.map((id) => {
                const card = data.index.get(id)!;
                return (
                  <RecipeCardView
                    key={id}
                    focusKey={`sr-${id}`}
                    card={card}
                    onEnter={() => navigate({ name: 'recipe', id })}
                  />
                );
              })}
            </div>
          </FocusGroup>
        )}
      </div>
    </div>
  );
};
