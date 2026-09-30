import { createContext, useContext } from 'react';
import type { LanguageInfo, RecipeCard, TvManifest } from '../api/types';
import type { UIStrings } from '../i18n/strings';

export type Screen =
  | { name: 'home' }
  | { name: 'chapters' }
  | { name: 'chapter'; chapterId: number; title: string }
  | { name: 'search' }
  | { name: 'recipe'; id: string }
  | { name: 'kids' }
  | { name: 'kidsRecipe'; id: string }
  | { name: 'kidsSteps'; id: string }
  | { name: 'kidsDone'; id: string; title: string }
  | { name: 'settings' }
  | { name: 'language'; firstRun?: boolean };

export const screenId = (s: Screen): string =>
  s.name === 'chapter'
    ? `chapter:${s.chapterId}`
    : s.name === 'recipe'
      ? `recipe:${s.id}`
      : s.name === 'kidsRecipe'
        ? `kid:${s.id}`
        : s.name === 'kidsSteps'
          ? `kidsteps:${s.id}`
          : s.name === 'kidsDone'
            ? `kiddone:${s.id}`
        : s.name === 'language'
          ? `language:${s.firstRun ? 'first' : 'settings'}`
          : s.name;

export interface LangData {
  index: Map<string, RecipeCard>;
  feed: { rows: { key: string; title: string; items: string[] }[] };
  chapters: { id: number; name: string; recipeCount: number; coverImage?: string }[];
  kids: Map<string, import('../api/types').KidsCard>;
}

export interface AppContextValue {
  manifest: TvManifest;
  lang: string;
  langInfo: LanguageInfo | undefined;
  dir: 'ltr' | 'rtl';
  s: UIStrings;
  data: LangData;
  navigate: (screen: Screen) => void;
  /** Top-level tabs replace each other instead of piling up on the stack. */
  goTab: (screen: Screen) => void;
  /** Collapse the stack back to [home, screen] — e.g. kids celebration → kids grid. */
  jumpTo: (screen: Screen) => void;
  back: () => void;
  setLanguage: (code: string) => void;
  openVideo: (videoId: string, title: string) => void;
  closeVideo: () => void;
  /** Focus `key` if the engine's current focus no longer points at a live node. */
  ensureFocus: (key: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside AppContext');
  return ctx;
}
