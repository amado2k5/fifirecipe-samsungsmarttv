import React, { useMemo, useState } from 'react';
import { useApp } from '../app/AppContext';
import { assetUrl } from '../api/client';
import { Img, KidsCardView, RecipeCardView } from '../components/Cards';
import { FocusGroup } from '../components/Focusable';
import { Rail } from '../components/Rail';
import { TopNav } from '../components/TopNav';

export const HOME_DEFAULT_FOCUS = 'rk-featured-0';

const MetaPill: React.FC<{ text?: string; tone: 'leaf' | 'tomato' | 'sun' }> = ({ text, tone }) =>
  text ? (
    <span
      className={`rounded-full px-5 py-2 text-[22px] font-bold ${
        tone === 'leaf' ? 'bg-leaf-soft text-leaf-deep' : tone === 'tomato' ? 'bg-tomato-soft text-tomato' : 'bg-sun-soft text-ink'
      }`}
    >
      {text}
    </span>
  ) : null;

export const HomeScreen: React.FC = () => {
  const { s, data, navigate } = useApp();
  const [heroIdx, setHeroIdx] = useState(0);

  const featured = useMemo(
    () => data.feed.rows.find((r) => r.key === 'featured')?.items ?? [],
    [data.feed],
  );
  const heroCard = data.index.get(featured[Math.min(heroIdx, featured.length - 1)] ?? '');

  return (
    <div className="fade-in flex h-full flex-col">
      <TopNav active="home" />
      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto pb-16">
        {heroCard && (
          <header
            className="mb-8 flex gap-0 overflow-hidden rounded-[2rem] bg-card border-2 border-card-border"
            style={{ height: 430, boxShadow: '0 8px 30px rgb(67 49 31 / 0.10)' }}
          >
            <div className="flex min-w-0 flex-1 flex-col justify-center p-10">
              <p className="mb-3 text-2xl font-bold tracking-wide text-leaf-deep">{s.tagline}</p>
              <h1 className="text-6xl font-extrabold leading-tight text-ink line-clamp-2">{heroCard.title}</h1>
              <div className="mt-6 flex flex-wrap gap-3">
                <MetaPill text={heroCard.prepTime} tone="leaf" />
                <MetaPill text={heroCard.cookTime} tone="tomato" />
                <MetaPill text={heroCard.servings} tone="sun" />
              </div>
            </div>
            <div className="relative h-full w-[46%] shrink-0">
              <Img
                key={heroCard.id}
                src={assetUrl(heroCard.image)}
                alt={heroCard.title}
                className="hero-fade absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </header>
        )}

        {data.feed.rows.map((row) => {
          if (row.items.length === 0) return null;
          if (row.key === 'kids') {
            return (
              <Rail
                key={row.key}
                focusKey={`rail-${row.key}`}
                title={row.title}
                count={row.items.length}
                renderItem={(i, markFocus) => {
                  const card = data.kids.get(row.items[i]);
                  if (!card) return <div key={i} style={{ width: 300 }} />;
                  return (
                    <KidsCardView
                      focusKey={`rk-${row.key}-${i}`}
                      card={card}
                      minutesLabel={s.minutesShort}
                      onEnter={() => navigate({ name: 'kidsRecipe', id: card.id })}
                      onFocusItem={markFocus}
                    />
                  );
                }}
              />
            );
          }
          return (
            <Rail
              key={row.key}
              focusKey={`rail-${row.key}`}
              title={row.title}
              count={row.items.length}
              renderItem={(i, markFocus) => {
                const card = data.index.get(row.items[i]);
                if (!card) return <div key={i} style={{ width: 320 }} />;
                return (
                  <RecipeCardView
                    focusKey={`rk-${row.key}-${i}`}
                    card={card}
                    onEnter={() => navigate({ name: 'recipe', id: card.id })}
                    onFocusItem={() => {
                      markFocus();
                      if (row.key === 'featured') setHeroIdx(i);
                    }}
                  />
                );
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
