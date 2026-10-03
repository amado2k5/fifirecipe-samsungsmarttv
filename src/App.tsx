import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  doesFocusableExist,
  getCurrentFocusKey,
  setFocus,
  updateRtl,
} from '@noriginmedia/norigin-spatial-navigation';
import { api, loadManifest } from './api/client';
import type { KidsCard, TvManifest } from './api/types';
import { AppContext, screenId, type LangData, type Screen } from './app/AppContext';
import { stringsFor } from './i18n/strings';
import { installBackHandler } from './remote';
import { exitApp, onConnectivityChange } from './platform';
import { LANG_STORAGE_KEY, STAGE_HEIGHT, STAGE_WIDTH } from './config';
import { CrayonFilter } from './components/KidsArt';
import { ErrorScreen } from './components/ErrorScreen';
import { VideoOverlay } from './components/VideoOverlay';
import { firstKeyForLang } from './components/Keyboard';
import { SplashScreen } from './screens/SplashScreen';
import { LanguageScreen } from './screens/LanguageScreen';
import { HomeScreen, HOME_DEFAULT_FOCUS } from './screens/HomeScreen';
import { ChaptersScreen, ChapterScreen } from './screens/ChaptersScreen';
import { SearchScreen } from './screens/SearchScreen';
import { RecipeScreen } from './screens/RecipeScreen';
import { KIDS_DEFAULT_FOCUS, KidsDoneScreen, KidsRecipeScreen, KidsScreen, KidsStepsScreen } from './screens/KidsScreens';
import { SettingsScreen, SETTINGS_DEFAULT_FOCUS } from './screens/SettingsScreen';

const TAB_NAMES = new Set<Screen['name']>(['home', 'chapters', 'search', 'kids', 'settings']);

/** Fixed 1920×1080 stage, letterboxed + scaled to the window. */
const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [box, setBox] = useState({ scale: 1, x: 0, y: 0 });
  useEffect(() => {
    const update = () => {
      const scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
      setBox({
        scale,
        x: Math.floor((window.innerWidth - STAGE_WIDTH * scale) / 2),
        y: Math.floor((window.innerHeight - STAGE_HEIGHT * scale) / 2),
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return (
    <div
      className="tv-stage"
      style={{ transform: `translate(${box.x}px, ${box.y}px) scale(${box.scale})` }}
    >
      {children}
    </div>
  );
};

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* packaged WebViews may deny storage; the app still works */
    }
  },
};

function resolveInitialLang(manifest: TvManifest): { code: string; isNew: boolean } {
  const codes = new Set(manifest.languages.map((l) => l.code));
  const saved = storage.get(LANG_STORAGE_KEY);
  if (saved && codes.has(saved)) return { code: saved, isNew: false };
  const nav = (navigator.language || '').toLowerCase();
  const match = [...codes].find((c) => nav === c || nav.startsWith(`${c}-`) || c.startsWith(nav));
  return { code: match ?? (codes.has('ar') ? 'ar' : codes.has('en') ? 'en' : [...codes][0]), isNew: !saved };
}

export default function App() {
  const [manifest, setManifest] = useState<TvManifest | null>(null);
  const [bootFailed, setBootFailed] = useState(false);
  const [lang, setLang] = useState('en');
  const [data, setData] = useState<LangData | null>(null);
  const [dataFailed, setDataFailed] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [stack, setStack] = useState<Screen[]>([{ name: 'home' }]);
  const [video, setVideo] = useState<{ id: string; title: string } | null>(null);
  const focusMemory = useRef<Record<string, string>>({});
  const preVideoFocus = useRef<string>('');

  const top = stack[stack.length - 1];
  const dir = manifest?.languages.find((l) => l.code === lang)?.dir ?? 'ltr';
  const strings = useMemo(() => stringsFor(lang), [lang]);

  const ensureFocus = useCallback((key: string | string[]) => {
    const current = getCurrentFocusKey();
    if (current && doesFocusableExist(current)) return;
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) {
      if (doesFocusableExist(k)) {
        setFocus(k);
        return;
      }
    }
  }, []);

  const loadLangData = useCallback(async (code: string) => {
    setDataLoading(true);
    setDataFailed(false);
    try {
      const [index, feed, chapters] = await Promise.all([
        api.index(code),
        api.feed(code),
        api.chapters(code),
      ]);
      let kids: KidsCard[] = [];
      if (feed.rows.some((r) => r.key === 'kids')) {
        kids = await api.kids(code).catch(() => []);
      }
      setData({
        index: new Map(index.map((c) => [c.id, c])),
        feed,
        chapters,
        kids: new Map(kids.map((k) => [k.id, k])),
      });
    } catch {
      setDataFailed(true);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const boot = useCallback(async () => {
    setBootFailed(false);
    try {
      const m = await loadManifest();
      setManifest(m);
      const initial = resolveInitialLang(m);
      setLang(initial.code);
      if (initial.isNew) {
        setStack([{ name: 'language', firstRun: true }]);
      } else {
        await loadLangData(initial.code);
        setStack([{ name: 'home' }]);
      }
    } catch {
      setBootFailed(true);
    }
  }, [loadLangData]);

  useEffect(() => {
    boot();
  }, [boot]);

  // Keep document direction + the engine's start edge in sync with language.
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    updateRtl(dir === 'rtl');
  }, [dir, lang]);

  const setLanguage = useCallback(
    (code: string) => {
      storage.set(LANG_STORAGE_KEY, code);
      setLang(code);
      focusMemory.current = {};
      setStack([{ name: 'home' }]);
      setData(null);
      loadLangData(code);
    },
    [loadLangData],
  );

  const rememberFocus = useCallback(() => {
    const key = getCurrentFocusKey();
    if (key) focusMemory.current[screenId(top)] = key;
  }, [top]);

  const navigate = useCallback(
    (screen: Screen) => {
      rememberFocus();
      setStack((prev) => [...prev, screen]);
    },
    [rememberFocus],
  );

  const goTab = useCallback(
    (screen: Screen) => {
      rememberFocus();
      setStack((prev) => {
        if (prev[prev.length - 1]?.name === screen.name) return prev;
        // Home stays the root so Back from any tab always lands on it.
        const base = prev.length > 0 && prev[0].name === 'home' ? [prev[0]] : [];
        if (TAB_NAMES.has(prev[prev.length - 1]?.name)) return [...base, screen];
        return [...prev, screen];
      });
    },
    [rememberFocus],
  );

  const jumpTo = useCallback(
    (screen: Screen) => {
      rememberFocus();
      setStack((prev) => [prev[0] ?? { name: 'home' }, screen]);
    },
    [rememberFocus],
  );

  const back = useCallback(() => {
    if (video) {
      setVideo(null);
      if (preVideoFocus.current) setFocus(preVideoFocus.current);
      return;
    }
    rememberFocus();
    if (stack.length <= 1) {
      // At the main screen Return closes the app and shows Smart Hub
      // (Samsung checklist CO-US-05). No-op in a desktop browser.
      exitApp();
      return;
    }
    setStack((prev) => prev.slice(0, -1));
  }, [video, rememberFocus, stack.length]);

  useEffect(() => installBackHandler(back), [back]);

  // Network loss: show a banner (CO-CN-02) and, on reconnect, retry whatever
  // failed while offline (CO-CN-01).
  const [offline, setOffline] = useState(() => navigator.onLine === false);
  useEffect(
    () =>
      onConnectivityChange((online) => {
        setOffline(!online);
        if (!online) return;
        if (bootFailed) boot();
        else if (dataFailed && !data) loadLangData(lang);
      }),
    [bootFailed, dataFailed, data, boot, loadLangData, lang],
  );

  const openVideo = useCallback((id: string, title: string) => {
    preVideoFocus.current = getCurrentFocusKey();
    setVideo({ id, title });
  }, []);

  const closeVideo = useCallback(() => {
    setVideo(null);
    if (preVideoFocus.current) setFocus(preVideoFocus.current);
  }, []);

  // Error screens live outside the screen stack — focus Retry when they show.
  useEffect(() => {
    if (bootFailed || (dataFailed && !data)) {
      requestAnimationFrame(() => {
        if (doesFocusableExist('error-retry')) setFocus('error-retry');
      });
    }
  }, [bootFailed, dataFailed, data]);

  // Focus when the overlay opens.
  useEffect(() => {
    if (video) {
      requestAnimationFrame(() => {
        if (doesFocusableExist('video-toggle')) setFocus('video-toggle');
      });
    }
  }, [video]);

  // Coming back to Home from another tab: ask for a fresh home layout (the
  // server returns a different random hero + rails every time). Failures keep
  // the current feed.
  const prevTopName = useRef<Screen['name']>(top.name);
  useEffect(() => {
    const from = prevTopName.current;
    prevTopName.current = top.name;
    if (top.name !== 'home' || !TAB_NAMES.has(from) || from === 'home') return;
    let current = true;
    api
      .freshFeed(lang)
      .then((feed) => {
        if (current) setData((prev) => (prev ? { ...prev, feed } : prev));
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [top.name, lang]);

  // Restore (or establish) focus whenever the top screen changes.
  const prevScreenRef = useRef('');
  useEffect(() => {
    const id = screenId(top);
    const defaults: Record<string, string> = {
      home: HOME_DEFAULT_FOCUS,
      chapters: `ch-${data?.chapters[0]?.id ?? ''}`,
      chapter: `grid-${top.name === 'chapter' ? top.chapterId : 0}-0`,
      search: firstKeyForLang(lang),
      kids: KIDS_DEFAULT_FOCUS,
      kidsSteps: 'kstep-card',
      kidsDone: 'kids-done-again',
      settings: SETTINGS_DEFAULT_FOCUS,
      language: `lang-${lang}`,
    };
    const dflt = defaults[top.name] ?? '';
    const screenChanged = prevScreenRef.current !== id;
    prevScreenRef.current = id;
    const raf = requestAnimationFrame(() => {
      // Same screen re-render (e.g. data arrived): keep focus if still valid.
      if (!screenChanged) {
        ensureFocus([focusMemory.current[id] ?? '', dflt].filter(Boolean));
        return;
      }
      // New screen: jump to the saved or default target even if the current
      // focus key still exists (shared chrome like the top nav).
      for (const k of [focusMemory.current[id] ?? '', dflt].filter(Boolean)) {
        if (doesFocusableExist(k)) {
          setFocus(k);
          return;
        }
      }
      ensureFocus([focusMemory.current[id] ?? '', dflt].filter(Boolean));
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenId(top), data]);

  const ctx = useMemo(
    () =>
      manifest && data
        ? {
            manifest,
            lang,
            langInfo: manifest.languages.find((l) => l.code === lang),
            dir,
            s: strings,
            data,
            navigate,
            goTab,
            jumpTo,
            back,
            setLanguage,
            openVideo,
            closeVideo,
            ensureFocus,
          }
        : manifest
          ? {
              manifest,
              lang,
              langInfo: manifest.languages.find((l) => l.code === lang),
              dir,
              s: strings,
              data: EMPTY_DATA,
              navigate,
              goTab,
              jumpTo,
              back,
              setLanguage,
              openVideo,
              closeVideo,
              ensureFocus,
            }
          : null,
    [manifest, data, lang, dir, strings, navigate, goTab, jumpTo, back, setLanguage, openVideo, closeVideo, ensureFocus],
  );

  const renderScreen = (screen: Screen) => {
    switch (screen.name) {
      case 'home':
        return <HomeScreen />;
      case 'chapters':
        return <ChaptersScreen />;
      case 'chapter':
        return <ChapterScreen chapterId={screen.chapterId} title={screen.title} />;
      case 'search':
        return <SearchScreen />;
      case 'recipe':
        return <RecipeScreen id={screen.id} />;
      case 'kids':
        return <KidsScreen />;
      case 'kidsRecipe':
        return <KidsRecipeScreen id={screen.id} />;
      case 'kidsSteps':
        return <KidsStepsScreen id={screen.id} />;
      case 'kidsDone':
        return <KidsDoneScreen id={screen.id} title={screen.title} />;
      case 'settings':
        return <SettingsScreen />;
      case 'language':
        return <LanguageScreen />;
    }
  };

  const body = (() => {
    if (bootFailed) {
      return <ErrorScreen title={strings.errorTitle} body={strings.errorBody} retryLabel={strings.retry} onRetry={boot} />;
    }
    if (!manifest) return <SplashScreen s={strings} />;
    if (top.name === 'language') return <LanguageScreen />;
    if (dataFailed && !data) {
      return (
        <ErrorScreen
          title={strings.errorTitle}
          body={strings.errorBody}
          retryLabel={strings.retry}
          onRetry={() => loadLangData(lang)}
        />
      );
    }
    if (!data || dataLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-4xl text-ink-dim">{strings.loading}</p>
        </div>
      );
    }
    return renderScreen(top);
  })();

  return (
    <Stage>
      {ctx ? (
        <AppContext.Provider value={ctx}>
          <div className="tv-safe">{body}</div>
          {video && <VideoOverlay videoId={video.id} title={video.title} onClose={closeVideo} />}
        </AppContext.Provider>
      ) : (
        <div className="tv-safe">{body}</div>
      )}
      {offline && (
        <div className="absolute inset-x-0 top-10 z-[60] flex justify-center" role="alert">
          <p className="rounded-full bg-ink px-10 py-4 text-3xl font-semibold text-paper shadow-xl">
            ⚠ {strings.errorTitle}
          </p>
        </div>
      )}
      <CrayonFilter />
    </Stage>
  );
}

const EMPTY_DATA: LangData = { index: new Map(), feed: { rows: [] }, chapters: [], kids: new Map() };
