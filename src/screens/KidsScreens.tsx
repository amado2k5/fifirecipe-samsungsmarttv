import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { KidsCard, KidsRecipeDetail } from '../api/types';
import { useApp } from '../app/AppContext';
import { ErrorScreen } from '../components/ErrorScreen';
import { Focusable, FocusGroup } from '../components/Focusable';
import { KidsCardView, kidsGroupStyle } from '../components/Cards';
import { KidsArt } from '../components/KidsArt';
import { TopNav } from '../components/TopNav';
import { allergenName, fill } from '../i18n/strings';

export const KIDS_DEFAULT_FOCUS = 'kf-all';

const GROUPS = ['breakfast', 'snack', 'savoury', 'sweet', 'drink'] as const;
const RAINBOW =
  'linear-gradient(90deg,#ff8a80 0%,#ffd54f 20%,#aed581 40%,#4fc3f7 60%,#ba68c8 80%,#ff8a80 100%)';

const groupLabel = (s: ReturnType<typeof useApp>['s'], group: string): string =>
  ({
    breakfast: s.groupBreakfast,
    snack: s.groupSnack,
    savoury: s.groupSavoury,
    sweet: s.groupSweet,
    drink: s.groupDrink,
  })[group] ?? group;

/** Kids screens escape the 5% safe area for a full-bleed polka-dot canvas;
 *  inner content re-applies the safe padding itself. */
const KidsRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="kids-root" style={{ inset: '-54px -96px' }}>
    <div className="fade-in flex h-full flex-col" style={{ padding: '54px 96px' }}>
      {children}
    </div>
  </div>
);

const MetaChip: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={`rounded-full px-5 py-2 text-[24px] font-extrabold ${className ?? 'bg-[#ffd93b] text-[#4a3426]'}`}>
    {children}
  </span>
);

export const KidsScreen: React.FC = () => {
  const { s, data, navigate } = useApp();
  const [group, setGroup] = useState('all');
  const [noCookOnly, setNoCookOnly] = useState(false);

  const cards = useMemo(
    () =>
      [...data.kids.values()].filter(
        (c: KidsCard) => (group === 'all' || c.group === group) && (!noCookOnly || c.noCook),
      ),
    [data.kids, group, noCookOnly],
  );

  const chip = (id: string, label: string, active: boolean, emoji: string, onPick: () => void, chipCls = '') => (
    <Focusable key={id} focusKey={id} onEnter={onPick} className="shrink-0 rounded-full">
      {(focused) => (
        <div
          className={`rounded-full border-4 px-6 py-2.5 text-[26px] font-extrabold transition-colors ${
            active ? `${chipCls} text-white` : 'border-[#e8d9bd] bg-white/80 text-[#6b5335]'
          } ${focused ? 'border-[var(--color-focus)]' : ''}`}
          style={{ borderColor: focused ? 'var(--color-focus)' : undefined }}
        >
          {emoji} {label}
        </div>
      )}
    </Focusable>
  );

  return (
    <KidsRoot>
      <TopNav active="kids" />

      {/* Rainbow strip + header, mirroring the website's Cooking with Kids. */}
      <div className="mb-4 h-3 w-full rounded-full" style={{ background: RAINBOW }} aria-hidden="true" />
      <header className="mb-6 flex items-center gap-6">
        <KidsArt id="chef" size={96} />
        <div>
          <h1 className="text-5xl font-extrabold text-[#4a3426]">{s.kids}</h1>
          <p className="mt-1 text-2xl font-bold text-[#8a6f52]">{s.tagline}</p>
        </div>
      </header>

      <FocusGroup focusKey="kids-filters" className="mb-6 flex flex-wrap gap-4">
        {chip('kf-all', s.all, group === 'all' && !noCookOnly, '🌈', () => {
          setGroup('all');
          setNoCookOnly(false);
        }, 'bg-[#8e6fc0] border-[#8e6fc0]')}
        {GROUPS.map((g) => {
          const st = kidsGroupStyle(g);
          return chip(`kf-${g}`, groupLabel(s, g), group === g && !noCookOnly, st.emoji, () => {
            setGroup(g);
            setNoCookOnly(false);
          }, `${st.chip}`);
        })}
        {chip('kf-nocook', s.noCook, noCookOnly, '❄️', () => setNoCookOnly((v) => !v), 'bg-[#4fc3f7] border-[#4fc3f7]')}
      </FocusGroup>

      <FocusGroup focusKey="kids-grid" className="hide-scrollbar min-h-0 flex-1 overflow-y-auto pb-16">
        <div className="grid grid-cols-5 gap-7 py-4">
          {cards.map((card, i) => (
            <div key={card.id} className="kids-pop" style={{ animationDelay: `${Math.min(i, 14) * 45}ms` }}>
              <KidsCardView
                focusKey={`kid-${card.id}`}
                card={card}
                minutesLabel={s.minutesShort}
                onEnter={() => navigate({ name: 'kidsRecipe', id: card.id })}
              />
            </div>
          ))}
        </div>
      </FocusGroup>
    </KidsRoot>
  );
};

const useKidsRecipe = (id: string) => {
  const { lang } = useApp();
  const [recipe, setRecipe] = useState<KidsRecipeDetail | null>(null);
  const [error, setError] = useState(false);
  const load = () => {
    setError(false);
    setRecipe(null);
    api
      .kidsRecipe(lang, id)
      .then(setRecipe)
      .catch(() => setError(true));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id, lang]);
  return { recipe, error, reload: load };
};

const ReadyRowItem: React.FC<{ art: string; label: string }> = ({ art, label }) => (
  <div className="flex items-center gap-3 rounded-full border-4 border-[#f0e2c8] bg-white/85 px-5 py-2.5">
    <KidsArt id={art} size={44} />
    <span className="text-[24px] font-extrabold text-[#4a3426]">{label}</span>
  </div>
);

export const KidsRecipeScreen: React.FC<{ id: string }> = ({ id }) => {
  const { s, lang, ensureFocus, navigate } = useApp();
  const { recipe, error, reload } = useKidsRecipe(id);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const style = kidsGroupStyle(recipe?.group);

  useEffect(() => {
    if (recipe) ensureFocus('kids-hero');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe]);

  if (error) {
    return <ErrorScreen title={s.errorTitle} body={s.errorBody} retryLabel={s.retry} onRetry={reload} />;
  }
  if (!recipe) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-4xl text-ink-dim">{s.loading}</p>
      </div>
    );
  }

  const toggle = (i: number) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <KidsRoot>
      <FocusGroup focusKey={`kids-recipe-${id}`} className="hide-scrollbar h-full overflow-y-auto pb-10">
        <Focusable focusKey="kids-hero" isStatic className="rounded-[2rem]">
          <div className={`flex items-center gap-10 rounded-[2rem] border-4 ${style.card} ${style.border} p-10`}>
            <div className="rounded-full bg-white/90 p-8 shadow-inner">
              <KidsArt id={recipe.cover} size={200} />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-2xl font-extrabold text-[#8a6f52]">{s.getReady}</p>
              <h1 className="text-6xl font-extrabold leading-tight text-[#4a3426]">{recipe.title}</h1>
              {recipe.intro && <p className="mt-3 text-3xl leading-snug text-[#7a5c3e]">{recipe.intro}</p>}
              <div className="mt-5 flex flex-wrap gap-3">
                <MetaChip>{s.ages} {recipe.ages}</MetaChip>
                <MetaChip>⏱ {recipe.minutes} {s.minutesShort}</MetaChip>
                {recipe.servings && <MetaChip>🍽 {recipe.servings} {s.servings}</MetaChip>}
                {recipe.noCook ? (
                  <MetaChip className="bg-[#b3e5fc] text-[#14455e]">❄ {s.noCook}</MetaChip>
                ) : (
                  <MetaChip className="bg-[#ffccbc] text-[#7c2d12]">👨‍👧 {s.grownUp}</MetaChip>
                )}
              </div>
              {recipe.allergens && recipe.allergens.length > 0 && (
                <p className="mt-4 inline-block rounded-2xl bg-[#ff8a80]/25 px-5 py-2 text-2xl font-bold text-[#a13333]">
                  ⚠ {s.contains}: {recipe.allergens.map((a) => allergenName(lang, a)).join(', ')}
                </p>
              )}
            </div>
          </div>
        </Focusable>

        <div className="mt-6 flex gap-4">
          <ReadyRowItem art="wash-hands" label={s.washHands} />
          <ReadyRowItem art="apron" label={s.wearApron} />
          <ReadyRowItem art="grown-up" label={s.grownUp} />
        </div>

        <div className="mt-8 grid grid-cols-3 gap-10">
          <section>
            <h2 className="mb-1 text-4xl font-extrabold text-[#4a3426]">{s.ingredients}</h2>
            <p className="mb-3 text-[22px] font-bold text-[#8a6f52]">{s.tickHint}</p>
            <div className="flex flex-col gap-3">
              {recipe.ingredients.map((ing, i) => (
                <Focusable key={i} focusKey={`king-${i}`} onEnter={() => toggle(i)} className="rounded-2xl">
                  {(focused) => (
                    <div
                      className={`flex items-center gap-4 rounded-2xl border-4 p-4 ${
                        ticked.has(i)
                          ? 'border-[#7cb342] bg-[#f1f8e9]'
                          : `border-[#f0e2c8] bg-white/85 ${focused ? 'border-[var(--color-focus)]' : ''}`
                      }`}
                      style={{ borderColor: focused && !ticked.has(i) ? 'var(--color-focus)' : undefined }}
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 text-2xl font-extrabold ${
                          ticked.has(i) ? 'border-[#558b2f] bg-[#7cb342] text-white' : 'border-[#e8d9bd] bg-white text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <KidsArt id={ing.art} size={52} />
                      <span className={`text-[24px] font-bold leading-snug text-[#4a3426] ${ticked.has(i) ? 'line-through opacity-60' : ''}`}>
                        {ing.text}
                      </span>
                    </div>
                  )}
                </Focusable>
              ))}
            </div>
            {recipe.tools && recipe.tools.length > 0 && (
              <div className="mt-6 rounded-3xl border-4 border-[#f0e2c8] bg-white/85 p-5">
                <h3 className="mb-3 text-2xl font-extrabold text-[#8a6f52]">{s.tools}</h3>
                <div className="flex flex-wrap gap-4">
                  {recipe.tools.map((t) => (
                    <KidsArt key={t} id={t} size={64} />
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="col-span-2">
            <h2 className="mb-4 text-4xl font-extrabold text-[#4a3426]">{s.steps}</h2>
            <p className="mb-4 text-2xl font-bold text-[#8a6f52]">
              {fill(s.stepOf, { n: 1, t: recipe.steps.length })}
            </p>
            <div className="flex flex-col gap-4">
              {recipe.steps.map((st, i) => (
                <Focusable key={i} focusKey={`kstep-${i}`} isStatic className="rounded-3xl">
                  <div className="flex gap-5 rounded-3xl border-4 border-[#f0e2c8] bg-white/85 p-6">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ff8a65] text-3xl font-extrabold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[26px] font-bold leading-relaxed text-[#4a3426]">{st.text}</p>
                      <div className="mt-2 flex items-center gap-4">
                        {st.adult && (
                          <span className="inline-flex items-center gap-2 rounded-lg bg-[#ff8a80]/25 px-4 py-1.5 text-xl font-extrabold text-[#a13333]">
                            <KidsArt id="grown-up" size={30} crayon={false} /> {s.grownUp}
                          </span>
                        )}
                        {st.items?.slice(0, 5).map((it) => <KidsArt key={it} id={it} size={40} crayon={false} />)}
                      </div>
                    </div>
                  </div>
                </Focusable>
              ))}
            </div>
            {recipe.tip && (
              <Focusable focusKey="ktip" isStatic className="mt-6 rounded-3xl">
                <p className="rounded-3xl bg-[#fff3c4] p-6 text-[26px] font-extrabold leading-relaxed text-[#5d4317]">
                  ⭐ {s.tip}: {recipe.tip}
                </p>
              </Focusable>
            )}
          </section>
        </div>

        <Focusable focusKey="lets-cook" onEnter={() => navigate({ name: 'kidsSteps', id })} className="mt-8 self-center rounded-full">
          {(focused) => (
            <div
              className="rounded-full border-4 px-14 py-5 text-4xl font-extrabold text-white"
              style={{
                background: 'linear-gradient(135deg,#7cb342,#43a047)',
                borderColor: focused ? 'var(--color-focus)' : '#558b2f',
                boxShadow: '0 8px 0 rgba(74,52,38,0.22)',
              }}
            >
              🍳 {s.letsCook}
            </div>
          )}
        </Focusable>
      </FocusGroup>
    </KidsRoot>
  );
};

export const KidsStepsScreen: React.FC<{ id: string }> = ({ id }) => {
  const { s, ensureFocus, navigate } = useApp();
  const { recipe, error, reload } = useKidsRecipe(id);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (recipe) ensureFocus('kstep-card');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe]);

  if (error) {
    return <ErrorScreen title={s.errorTitle} body={s.errorBody} retryLabel={s.retry} onRetry={reload} />;
  }
  if (!recipe) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-4xl text-ink-dim">{s.loading}</p>
      </div>
    );
  }

  const total = recipe.steps.length;
  const cur = recipe.steps[Math.min(step, total - 1)];
  const last = step === total - 1;

  return (
    <KidsRoot>
      <FocusGroup focusKey={`kids-steps-${id}`} className="flex h-full flex-col">
        <div className="mb-4 h-3 w-full rounded-full" style={{ background: RAINBOW }} aria-hidden="true" />
        <header className="mb-6 flex items-center justify-between">
          <h1 className="min-w-0 truncate text-5xl font-extrabold text-[#4a3426]">{recipe.title}</h1>
          <div className="ms-8 flex shrink-0 items-center gap-3">
            {recipe.steps.map((_, i) => (
              <span
                key={i}
                className={`h-5 rounded-full transition-all ${i === step ? 'w-14 bg-[#ff8a65]' : i < step ? 'w-5 bg-[#7cb342]' : 'w-5 bg-[#e8d9bd]'}`}
              />
            ))}
          </div>
        </header>

        <Focusable focusKey="kstep-card" isStatic className="rounded-[2rem]">
          <div className="fade-in flex min-h-[430px] gap-8 rounded-[2rem] border-4 border-[#f0e2c8] bg-white/90 p-10" key={step}>
            <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-[#ff8a65] text-6xl font-extrabold text-white shadow-lg">
              {step + 1}
            </span>
            <div className="min-w-0">
              <p className="mb-3 text-3xl font-extrabold text-[#8a6f52]">
                {fill(s.stepOf, { n: step + 1, t: total })}
              </p>
              <p className="text-4xl font-bold leading-relaxed text-[#4a3426]">{cur.text}</p>
              <div className="mt-5 flex items-center gap-4">
                {cur.adult && (
                  <span className="inline-flex items-center gap-2 rounded-2xl bg-[#ff8a80]/25 px-5 py-2.5 text-2xl font-extrabold text-[#a13333]">
                    <KidsArt id="grown-up" size={38} crayon={false} /> {s.grownUp}
                  </span>
                )}
                {cur.timer != null && (
                  <span className="rounded-2xl bg-[#b3e5fc] px-5 py-2.5 text-2xl font-extrabold text-[#14455e]">
                    ⏱ {cur.timer} {s.minutesShort}
                  </span>
                )}
                {cur.items?.slice(0, 6).map((it) => <KidsArt key={it} id={it} size={52} crayon={false} />)}
              </div>
            </div>
          </div>
        </Focusable>

        <div className="mt-8 flex justify-center gap-6">
          {step > 0 && (
            <Focusable focusKey="kstep-prev" onEnter={() => setStep((v) => v - 1)} className="rounded-full">
              {(focused) => (
                <div
                  className="rounded-full border-4 bg-white/85 px-10 py-4 text-3xl font-extrabold text-[#6b5335]"
                  style={{ borderColor: focused ? 'var(--color-focus)' : '#e8d9bd' }}
                >
                  ◀ {s.prev}
                </div>
              )}
            </Focusable>
          )}
          <Focusable
            focusKey="kstep-next"
            onEnter={() => (last ? navigate({ name: 'kidsDone', id, title: recipe.title }) : setStep((v) => v + 1))}
            className="rounded-full"
          >
            {(focused) => (
              <div
                className="rounded-full border-4 px-12 py-4 text-3xl font-extrabold text-white"
                style={{
                  background: last ? 'linear-gradient(135deg,#ec407a,#d6336c)' : 'linear-gradient(135deg,#7cb342,#43a047)',
                  borderColor: focused ? 'var(--color-focus)' : last ? '#ad1457' : '#558b2f',
                  boxShadow: '0 8px 0 rgba(74,52,38,0.22)',
                }}
              >
                {last ? `🎉 ${s.finish}` : `${s.next} ▶`}
              </div>
            )}
          </Focusable>
        </div>
      </FocusGroup>
    </KidsRoot>
  );
};

const CONFETTI_ARTS = ['star', 'bell-pepper', 'cherry-tomatoes', 'sweet-potato', 'egg-cracked', 'star'];

export const KidsDoneScreen: React.FC<{ id: string; title: string }> = ({ id, title }) => {
  const { s, ensureFocus, jumpTo } = useApp();

  useEffect(() => {
    ensureFocus('kids-done-again');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <KidsRoot>
      <div className="relative flex h-full flex-col items-center justify-center overflow-hidden">
        {CONFETTI_ARTS.map((a, i) => (
          <span
            key={i}
            className="kids-fall absolute top-0"
            style={{ left: `${8 + i * 15}%`, animationDelay: `${i * 0.25}s` }}
            aria-hidden="true"
          >
            <KidsArt id={a} size={64} crayon={false} />
          </span>
        ))}
        <div className="kids-pop relative rounded-[2.5rem] border-4 border-[#ffd54f] bg-white/95 px-20 py-14 text-center shadow-2xl">
          <KidsArt id="chef" size={150} />
          <h1 className="mt-4 text-7xl font-extrabold text-[#4a3426]">{s.doneTitle}</h1>
          <p className="mt-3 text-4xl font-bold text-[#8a6f52]">{title}</p>
          <p className="mt-5 text-3xl font-bold text-[#7a5c3e]">{s.doneBody}</p>
          <Focusable focusKey="kids-done-again" onEnter={() => jumpTo({ name: 'kids' })} className="mt-10 inline-block rounded-full">
            {(focused) => (
              <div
                className="rounded-full border-4 px-14 py-5 text-4xl font-extrabold text-white"
                style={{
                  background: 'linear-gradient(135deg,#7cb342,#43a047)',
                  borderColor: focused ? 'var(--color-focus)' : '#558b2f',
                  boxShadow: '0 8px 0 rgba(74,52,38,0.22)',
                }}
              >
                🌈 {s.cookAgain}
              </div>
            )}
          </Focusable>
        </div>
      </div>
    </KidsRoot>
  );
};
