import React, { useState } from 'react';
import { useApp } from '../app/AppContext';
import { ChapterCardView, RecipeCardView } from '../components/Cards';
import { FocusGroup } from '../components/Focusable';
import { TopNav } from '../components/TopNav';

export const ChaptersScreen: React.FC = () => {
  const { data, navigate } = useApp();
  return (
    <div className="flex h-full flex-col">
      <TopNav active="chapters" />
      <FocusGroup focusKey="chapters-grid" className="hide-scrollbar min-h-0 flex-1 overflow-y-auto pb-16">
        <div className="grid grid-cols-3 gap-8 py-4">
          {data.chapters.map((ch) => (
            <ChapterCardView
              key={ch.id}
              focusKey={`ch-${ch.id}`}
              name={ch.name}
              recipeCount={ch.recipeCount}
              coverImage={ch.coverImage}
              onEnter={() => navigate({ name: 'chapter', chapterId: ch.id, title: ch.name })}
            />
          ))}
        </div>
      </FocusGroup>
    </div>
  );
};

// Cards stay registered (so D-pad geometry works) but off-screen card
// content renders as a cheap placeholder — keeps DOM weight flat in chapters
// with 300+ recipes on low-memory TVs.
const GRID_WINDOW = 45;

export const ChapterScreen: React.FC<{ chapterId: number; title: string }> = ({ chapterId, title }) => {
  const { data, navigate } = useApp();
  const cards = [...data.index.values()].filter((c) => c.chapter === chapterId);
  const [anchor, setAnchor] = useState(0);
  return (
    <div className="flex h-full flex-col">
      <header className="mb-4 flex items-center gap-6 px-1">
        <h1 className="text-4xl font-extrabold text-ink">{title}</h1>
        <span className="rounded-full bg-leaf-soft px-5 py-1.5 text-2xl font-bold text-leaf-deep">{cards.length}</span>
      </header>
      <FocusGroup focusKey={`chapter-grid-${chapterId}`} className="hide-scrollbar min-h-0 flex-1 overflow-y-auto pb-16">
        <div className="grid grid-cols-5 gap-6 py-4">
          {cards.map((card, i) => (
            <RecipeCardView
              key={card.id}
              focusKey={`grid-${chapterId}-${i}`}
              card={card}
              lite={Math.abs(i - anchor) > GRID_WINDOW}
              onFocusItem={() => setAnchor(i)}
              onEnter={() => navigate({ name: 'recipe', id: card.id })}
            />
          ))}
        </div>
      </FocusGroup>
    </div>
  );
};
