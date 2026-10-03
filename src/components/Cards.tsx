import React, { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../api/client';
import type { KidsCard, RecipeCard } from '../api/types';
import { Focusable } from './Focusable';
import { KidsArt } from './KidsArt';

export const CARD_W = 316;
export const CARD_H = 178;

/** Kids card border+surface colors per recipe group (mirrors the website). */
export const KIDS_GROUP_STYLE: Record<string, { card: string; border: string; chip: string; emoji: string }> = {
  breakfast: { card: 'bg-amber-100', border: 'border-amber-300', chip: 'bg-amber-400 border-amber-500', emoji: '🥞' },
  snack: { card: 'bg-lime-100', border: 'border-lime-300', chip: 'bg-lime-400 border-lime-500', emoji: '🍎' },
  savoury: { card: 'bg-rose-100', border: 'border-rose-300', chip: 'bg-rose-400 border-rose-500', emoji: '🍕' },
  sweet: { card: 'bg-pink-100', border: 'border-pink-300', chip: 'bg-pink-400 border-pink-500', emoji: '🧁' },
  drink: { card: 'bg-sky-100', border: 'border-sky-300', chip: 'bg-sky-400 border-sky-500', emoji: '🥤' },
};

export const kidsGroupStyle = (group?: string) =>
  KIDS_GROUP_STYLE[group ?? ''] ?? { card: 'bg-amber-100', border: 'border-amber-300', chip: 'bg-amber-400 border-amber-500', emoji: '🍽️' };

interface ImgProps {
  src?: string;
  alt: string;
  className?: string;
}

/** Extra load attempts after a failure (dropped Wi-Fi, flaky CDN edge). */
const IMG_RETRIES = 2;

/**
 * Remote image with async decode and a friendly produce placeholder.
 * A failed load is retried twice with a short backoff before the placeholder
 * sticks, and a new `src` (e.g. the sharper full-size photo replacing the card
 * thumbnail) always gets a fresh start — previously one failure pinned the
 * placeholder for good.
 */
export const Img: React.FC<ImgProps> = ({ src, alt, className }) => {
  const [loadedSrc, setLoadedSrc] = useState(src);
  const [attempt, setAttempt] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  if (src !== loadedSrc) {
    setLoadedSrc(src);
    setAttempt(0);
    setWaiting(false);
    setFailed(false);
  }

  useEffect(() => () => clearTimeout(timer.current), [src]);

  const onError = () => {
    if (attempt >= IMG_RETRIES) {
      setFailed(true);
      return;
    }
    setWaiting(true);
    timer.current = setTimeout(() => {
      setWaiting(false);
      setAttempt((a) => a + 1);
    }, 800 * (attempt + 1));
  };

  if (!src || failed || waiting) {
    return (
      <div className={`bg-leaf-soft flex items-center justify-center ${className ?? ''}`} aria-label={alt}>
        <svg viewBox="0 0 100 100" width={84} height={84}>
          <circle cx="50" cy="56" r="30" fill="#ff5a4e" />
          <path d="M37 30 L45 32 L50 22 L55 32 L63 30 L57 38 Q50 42 43 38Z" fill="#4caf50" />
        </svg>
      </div>
    );
  }
  // A changed URL makes the browser request the image again on retries.
  const url = attempt ? `${src}${src.includes('?') ? '&' : '?'}retry=${attempt}` : src;
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      decoding="async"
      loading="lazy"
      draggable={false}
      onError={onError}
    />
  );
};

interface RecipeCardViewProps {
  focusKey: string;
  card: RecipeCard;
  onEnter: () => void;
  onFocusItem?: () => void;
  /** Render only the focusable shell — used to window big grids on low-RAM devices. */
  lite?: boolean;
}

export const RecipeCardView: React.FC<RecipeCardViewProps> = ({ focusKey, card, onEnter, onFocusItem, lite }) => (
  <Focusable focusKey={focusKey} onEnter={onEnter} onFocus={onFocusItem} className="shrink-0">
    {(focused) =>
      lite ? (
        <div
          className="rounded-3xl bg-card/70 border-2"
          style={{ width: CARD_W, height: CARD_H + 122, borderColor: focused ? 'var(--color-focus)' : 'var(--color-card-border)' }}
        />
      ) : (
      <div
        className="rounded-3xl overflow-hidden bg-card border-2"
        style={{
          width: CARD_W,
          borderColor: focused ? 'var(--color-focus)' : 'var(--color-card-border)',
          boxShadow: '0 4px 14px rgb(67 49 31 / 0.08)',
        }}
      >
        <div className="relative overflow-hidden" style={{ height: CARD_H }}>
          <Img src={assetUrl(card.image)} alt={card.title} className="absolute inset-0 w-full h-full object-cover" />
          {card.hasVideo && (
            <span className="absolute top-3 end-3 flex h-11 w-11 items-center justify-center rounded-full bg-tomato shadow-lg">
              <svg viewBox="0 0 24 24" width={22} height={22} fill="#fff">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
          )}
        </div>
        <div className="h-[122px] px-5 pt-3">
          <p className="text-[24px] font-bold leading-snug text-ink line-clamp-2">{card.title}</p>
          <p className="mt-1 text-[19px] text-ink-dim truncate">{card.cookingMethod ?? card.category ?? ''}</p>
        </div>
      </div>
    )}
  </Focusable>
);

interface KidsCardViewProps {
  focusKey: string;
  card: KidsCard;
  minutesLabel: string;
  onEnter: () => void;
  onFocusItem?: () => void;
}

export const KidsCardView: React.FC<KidsCardViewProps> = ({ focusKey, card, minutesLabel, onEnter, onFocusItem }) => {
  const style = kidsGroupStyle(card.group);
  return (
    <Focusable focusKey={focusKey} onEnter={onEnter} onFocus={onFocusItem} className="shrink-0">
      {(focused) => (
        <div
          className={`rounded-[2rem] border-4 ${style.card} ${style.border} text-[#43311f] flex flex-col items-center pt-6 ${focused ? 'kids-wiggle' : 'kids-pop'}`}
          style={{
            width: 300,
            height: 330,
            borderColor: focused ? 'var(--color-focus)' : undefined,
            boxShadow: '0 6px 0 rgba(74,52,38,0.18)',
          }}
        >
          <div className="rounded-full bg-white/90 p-4 shadow-inner">
            <KidsArt id={card.cover} size={130} />
          </div>
          <p className="mt-4 px-3 text-center text-[26px] font-extrabold leading-tight line-clamp-2">{card.title}</p>
          <p className="mt-auto mb-4 text-[20px] font-bold text-[#8a6f52]">
            {card.ages} · {card.minutes} {minutesLabel}
            {card.noCook ? ' · ❄' : ''}
          </p>
        </div>
      )}
    </Focusable>
  );
};

interface ChapterCardViewProps {
  focusKey: string;
  name: string;
  recipeCount: number;
  countLabel?: string;
  coverImage?: string;
  onEnter: () => void;
  onFocusItem?: () => void;
}

export const ChapterCardView: React.FC<ChapterCardViewProps> = ({ focusKey, name, recipeCount, coverImage, onEnter, onFocusItem }) => (
  <Focusable focusKey={focusKey} onEnter={onEnter} onFocus={onFocusItem} className="shrink-0">
    {(focused) => (
      <div
        className="rounded-3xl overflow-hidden bg-card border-2 flex flex-col"
        style={{
          width: 540,
          height: 300,
          borderColor: focused ? 'var(--color-focus)' : 'var(--color-card-border)',
          boxShadow: '0 4px 14px rgb(67 49 31 / 0.08)',
        }}
      >
        <div className="relative flex-1 min-h-0">
          <Img src={assetUrl(coverImage)} alt={name} className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-[28px] font-extrabold text-ink leading-tight truncate">{name}</p>
          <span className="ms-4 shrink-0 rounded-full bg-leaf-soft px-4 py-1 text-xl font-bold text-leaf-deep">
            {recipeCount}
          </span>
        </div>
      </div>
    )}
  </Focusable>
);

interface VideoCardViewProps {
  focusKey: string;
  title: string;
  channel?: string;
  duration?: string;
  thumb: string;
  onEnter: () => void;
  onFocusItem?: () => void;
}

export const VideoCardView: React.FC<VideoCardViewProps> = ({ focusKey, title, channel, duration, thumb, onEnter, onFocusItem }) => (
  <Focusable focusKey={focusKey} onEnter={onEnter} onFocus={onFocusItem} className="shrink-0">
    {(focused) => (
      <div
        className="rounded-3xl overflow-hidden bg-card border-2"
        style={{
          width: 440,
          borderColor: focused ? 'var(--color-focus)' : 'var(--color-card-border)',
          boxShadow: '0 4px 14px rgb(67 49 31 / 0.08)',
        }}
      >
        <div className="relative" style={{ height: 248 }}>
          <Img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-tomato/90 p-4 shadow-xl">
              <svg viewBox="0 0 24 24" width={40} height={40} fill="#fff">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </div>
          </div>
          {duration && (
            <span className="absolute bottom-3 end-3 rounded-lg bg-black/75 px-3 py-1 text-[18px] text-white">{duration}</span>
          )}
        </div>
        <div className="px-4 py-3">
          <p className="text-[24px] font-semibold leading-snug text-ink line-clamp-2">{title}</p>
          {channel && <p className="text-[19px] text-ink-dim mt-1 truncate">{channel}</p>}
        </div>
      </div>
    )}
  </Focusable>
);
