import React, { useEffect, useMemo, useState } from 'react';
import { api, assetUrl } from '../api/client';
import type { RecipeFile, VideoItem } from '../api/types';
import { useApp } from '../app/AppContext';
import { ErrorScreen } from '../components/ErrorScreen';
import { Img, VideoCardView } from '../components/Cards';
import { Focusable, FocusGroup } from '../components/Focusable';
import { Rail } from '../components/Rail';
import { youtubeThumbUrl } from '../config';

export const RECIPE_DEFAULT_FOCUS = 'recipe-hero';

interface Props {
  id: string;
}

interface Localized {
  title: string;
  subtitle?: string;
  chapter?: string;
  category?: string;
  cookingMethod?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  culturalNotes?: string;
  ingredients: { name: string; amount?: string }[];
  steps: { n: number; text: string; phase?: string; alternative?: string; tip?: boolean }[];
}

function localize(file: RecipeFile, lang: string): Localized {
  const r = file.recipe;
  const t = file.translations[lang] ?? {};
  const en = file.translations.en ?? {};
  // The master recipe.* fields are Arabic — for `lang === 'ar'` the
  // translations.ar block is empty, so fall back to the master fields
  // directly instead of the English translation.
  const pick = (k: 'title' | 'chapter' | 'category' | 'cookingMethod' | 'prepTime' | 'cookTime' | 'servings') =>
    t[k] ?? (lang === 'ar' ? r[k] : en[k] ?? r[k]);

  const trIng = t.ingredients ?? (lang === 'ar' ? {} : en.ingredients ?? {});
  const trIns = t.instructions ?? (lang === 'ar' ? {} : en.instructions ?? {});

  return {
    title: (pick('title') as string) ?? r.title,
    subtitle: r.titleEn !== (pick('title') as string) ? r.titleEn : undefined,
    chapter: (pick('chapter') as string) ?? r.chapter,
    category: (pick('category') as string) ?? r.category,
    cookingMethod: (pick('cookingMethod') as string) ?? r.cookingMethod,
    prepTime: (pick('prepTime') as string) ?? r.prepTime,
    cookTime: (pick('cookTime') as string) ?? r.cookTime,
    servings: (pick('servings') as string) ?? r.servings,
    // culturalNotes exists only in en/fr translations — fall through to
    // undefined (card hidden) rather than mixing English into other UIs.
    culturalNotes: t.culturalNotes,
    ingredients: r.masterIngredients.map((mi) => ({
      name: trIng[mi.id]?.name ?? mi.name,
      // A missing translated amount falls back to English, not Arabic.
      amount:
        trIng[mi.id]?.standardAmount ??
        (lang === 'ar' ? undefined : en.ingredients?.[mi.id]?.standardAmount) ??
        mi.standardAmount,
    })),
    steps: r.uniqueInstructions.map((ui) => ({
      n: ui.stepNumber,
      text:
        trIns[String(ui.stepNumber)] ??
        (lang === 'ar' ? ui.text ?? ui.textEn : ui.textEn ?? ui.text),
      phase: ui.phase,
      alternative: ui.isAlternative ? ui.alternativeLabel ?? 'alternative' : undefined,
      tip: ui.importance === 'tip',
    })),
  };
}

const Chip: React.FC<{ label?: string; value?: string; tone?: 'leaf' | 'tomato' | 'sun' }> = ({ label, value, tone = 'leaf' }) =>
  value ? (
    <span
      className={`rounded-full px-5 py-2.5 text-2xl font-semibold ${
        tone === 'leaf'
          ? 'bg-leaf-soft text-leaf-deep'
          : tone === 'tomato'
            ? 'bg-tomato-soft text-tomato'
            : 'bg-sun-soft text-ink'
      }`}
    >
      {label && <span className="me-2 opacity-70">{label}</span>}
      {value}
    </span>
  ) : null;

export const RecipeScreen: React.FC<Props> = ({ id }) => {
  const { s, lang, openVideo, ensureFocus, data } = useApp();
  const [file, setFile] = useState<RecipeFile | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [fullImage, setFullImage] = useState<string | undefined>();
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    setFile(null);
    api
      .recipe(id)
      .then(setFile)
      .catch(() => setError(true));
    api
      .images()
      .then((m) => setFullImage(m[id]?.full))
      .catch(() => undefined);
    api
      .videos(id)
      .then((vf) => setVideos(vf[lang] ?? vf.ar ?? vf.en ?? []))
      .catch(() => setVideos([]));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id, lang]);

  const loc = useMemo(() => (file ? localize(file, lang) : null), [file, lang]);

  useEffect(() => {
    if (loc) ensureFocus(RECIPE_DEFAULT_FOCUS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc]);

  if (error) {
    return <ErrorScreen title={s.errorTitle} body={s.errorBody} retryLabel={s.retry} onRetry={load} />;
  }
  if (!file || !loc) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-4xl text-ink-dim">{s.loading}</p>
      </div>
    );
  }

  const coreSteps = loc.steps.filter((st) => !st.alternative);
  const altGroups = new Map<string, typeof loc.steps>();
  for (const st of loc.steps) {
    if (st.alternative) {
      const g = altGroups.get(st.alternative) ?? [];
      g.push(st);
      altGroups.set(st.alternative, g);
    }
  }
  const tips = loc.steps.filter((st) => st.tip);
  const indexCard = data.index.get(id);
  const heroImg = fullImage ?? indexCard?.image;
  const est = file.estimate;

  return (
    <FocusGroup focusKey={`recipe-${id}`} className="hide-scrollbar h-full overflow-y-auto px-3 pt-3 pb-24 fade-in">
      <Focusable focusKey={RECIPE_DEFAULT_FOCUS} isStatic className="rounded-[2rem]">
        <div
          className="flex gap-10 rounded-[2rem] border-2 border-card-border bg-card p-8"
          style={{ boxShadow: '0 8px 30px rgb(67 49 31 / 0.10)' }}
        >
          <Img
            src={assetUrl(heroImg)}
            alt={loc.title}
            className="h-[440px] w-[640px] shrink-0 rounded-3xl object-cover"
          />
          <div className="min-w-0 py-2">
            {loc.chapter && <p className="mb-3 text-2xl font-bold text-leaf-deep">{loc.chapter}</p>}
            <h1 className="text-5xl font-extrabold leading-tight text-ink">{loc.title}</h1>
            {loc.subtitle && <p className="mt-3 text-2xl italic text-ink-dim">{loc.subtitle}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <Chip label={s.prep} value={loc.prepTime} tone="leaf" />
              <Chip label={s.cook} value={loc.cookTime} tone="tomato" />
              <Chip label={s.servings} value={loc.servings} tone="sun" />
              <Chip value={loc.category} tone="leaf" />
              <Chip value={loc.cookingMethod} tone="tomato" />
            </div>
            {est && (est.kcal || est.protein || est.carbs || est.fat) && (
              <div className="mt-4 flex flex-wrap gap-3 text-xl text-ink-dim">
                {est.kcal != null && <span>{est.kcal} {s.kcal}</span>}
                {est.protein != null && <span>· {est.protein}g {s.protein}</span>}
                {est.carbs != null && <span>· {est.carbs}g {s.carbs}</span>}
                {est.fat != null && <span>· {est.fat}g {s.fat}</span>}
              </div>
            )}
            {loc.culturalNotes && (
              <div className="mt-6 rounded-2xl border-s-4 border-sun bg-sun-soft p-5">
                <p className="text-xl font-bold text-leaf-deep">{s.culturalNotes}</p>
                <p className="mt-2 text-[24px] leading-relaxed text-ink">{loc.culturalNotes}</p>
              </div>
            )}
          </div>
        </div>
      </Focusable>

      <div className="mt-10 grid grid-cols-3 gap-10">
        <section className="min-w-0">
          <h2 className="mb-4 flex items-center gap-3 text-4xl font-bold text-ink">
            <span className="inline-block h-7 w-7 rounded-full bg-leaf" aria-hidden="true" />
            {s.ingredients}
          </h2>
          <div className="rounded-3xl border-2 border-card-border bg-card p-3">
            {loc.ingredients.map((ing, i) => (
              <React.Fragment key={i}>
              {/* Divider lives between rows (not on them) so the focus ring hugs a
                  padded, fully rounded row instead of sitting on the text. */}
              {i > 0 && <div className="mx-4 border-t-2 border-card-border" aria-hidden="true" />}
              <Focusable focusKey={`ing-${i}`} isStatic className="rounded-2xl">
                {/* Name and amount are stacked rather than side by side: amounts can be
                    long phrases ("500g fresh leaves, finely chopped…") that squeeze the
                    name in the one-third-width column. */}
                <div className="flex gap-3 rounded-2xl px-4 py-4 text-[24px] leading-snug">
                  <span className="mt-2 inline-block h-3 w-3 shrink-0 rounded-full bg-leaf" aria-hidden="true" />
                  <div className="min-w-0 flex-1 break-words">
                    <span className="block font-medium text-ink">{ing.name}</span>
                    {ing.amount && <span className="mt-1 block font-bold text-leaf-deep">{ing.amount}</span>}
                  </div>
                </div>
              </Focusable>
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className="col-span-2 min-w-0">
          <h2 className="mb-4 flex items-center gap-3 text-4xl font-bold text-ink">
            <span className="inline-block h-7 w-7 rounded-full bg-tomato" aria-hidden="true" />
            {s.steps}
          </h2>
          <div className="flex flex-col gap-4">
            {coreSteps.map((st) => (
              <Focusable key={st.n} focusKey={`step-${st.n}`} isStatic className="rounded-3xl">
                <div className="flex gap-5 rounded-3xl border-2 border-card-border bg-card p-6">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-leaf text-3xl font-extrabold text-white">
                    {st.n}
                  </span>
                  <p className="text-[26px] leading-relaxed text-ink">{st.text}</p>
                </div>
              </Focusable>
            ))}
          </div>
        </section>
      </div>

      {altGroups.size > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-3 text-4xl font-bold text-ink">
            <span className="inline-block h-7 w-7 rounded-full bg-berry" aria-hidden="true" />
            {s.alternativeMethods}
          </h2>
          <div className="flex flex-col gap-4">
            {[...altGroups.entries()].map(([label, steps], gi) =>
              steps.map((st) => (
                <Focusable key={`${gi}-${st.n}`} focusKey={`alt-${gi}-${st.n}`} isStatic className="rounded-3xl">
                  <div className="rounded-3xl border-2 border-berry/30 bg-tomato-soft/50 p-6">
                    <span className="mb-2 inline-block rounded-full bg-berry/15 px-4 py-1 text-xl font-bold text-berry">
                      {label}
                    </span>
                    <p className="text-[26px] leading-relaxed text-ink">{st.text}</p>
                  </div>
                </Focusable>
              )),
            )}
          </div>
        </section>
      )}

      {tips.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-3 text-4xl font-bold text-ink">
            <span className="inline-block h-7 w-7 rounded-full bg-sun" aria-hidden="true" />
            {s.tips}
          </h2>
          {tips.map((st, i) => (
            <Focusable key={st.n} focusKey={`tip-${i}`} isStatic className="mb-4 rounded-3xl">
              <p className="rounded-3xl border-2 border-card-border bg-sun-soft p-6 text-[26px] font-medium leading-relaxed text-ink">
                💡 {st.text}
              </p>
            </Focusable>
          ))}
        </section>
      )}

      {videos.length > 0 && (
        <section className="mt-12">
          <Rail
            focusKey="videos-rail"
            title={s.videos}
            count={videos.length}
            renderItem={(i, mark) => (
              <VideoCardView
                focusKey={`vid-${i}`}
                title={videos[i].title}
                channel={videos[i].channel}
                duration={videos[i].duration}
                thumb={youtubeThumbUrl(videos[i].id)}
                onEnter={() => openVideo(videos[i].id, videos[i].title)}
                onFocusItem={mark}
              />
            )}
          />
        </section>
      )}
    </FocusGroup>
  );
};
