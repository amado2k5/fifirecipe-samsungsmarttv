import React from 'react';
import type { UIStrings } from '../i18n/strings';
import { KidsArt } from '../components/KidsArt';

const PRODUCE = ['tomato', 'lemon', 'mint', 'strawberry', 'cucumber'];

export const SplashScreen: React.FC<{ s: UIStrings }> = ({ s }) => (
  <div className="flex h-full flex-col items-center justify-center">
    <img src="logo.webp" alt={s.appName} width={260} height={240} className="splash-logo object-contain" draggable={false} />
    <h1 className="mt-8 text-6xl font-extrabold text-ink">{s.appName}</h1>
    <p className="mt-4 text-2xl text-ink-dim">{s.tagline}</p>
    <div className="mt-8 flex gap-6" aria-hidden="true">
      {PRODUCE.map((id) => (
        <KidsArt key={id} id={id} size={64} crayon={false} />
      ))}
    </div>
    <p className="mt-10 animate-pulse text-2xl font-semibold text-tomato">{s.loading}</p>
  </div>
);
