import React from 'react';
import { ART } from '../kidsArt';

const INK = '#4a3426';

/** Shared crayon texture filter, rendered once at app root. */
export const CrayonFilter: React.FC = () => (
  <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
    <defs>
      <filter id="kids-crayon" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="wobble" />
        <feDisplacementMap in="SourceGraphic" in2="wobble" scale="2.5" xChannelSelector="R" yChannelSelector="G" result="drawn" />
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="9" result="grain" />
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 2.05" result="paper" />
        <feComposite in="drawn" in2="paper" operator="in" />
      </filter>
    </defs>
  </svg>
);

interface KidsArtProps {
  id: string;
  size?: number;
  className?: string;
  crayon?: boolean;
}

/** One kids-mode drawing (ingredient, tool, dish cover) on a 100×100 canvas. */
export const KidsArt: React.FC<KidsArtProps> = ({ id, size = 100, className, crayon = true }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
    <g
      stroke={INK}
      strokeWidth={3}
      strokeLinejoin="round"
      strokeLinecap="round"
      filter={crayon ? 'url(#kids-crayon)' : undefined}
      dangerouslySetInnerHTML={{ __html: ART[id] ?? ART['star'] ?? '' }}
    />
  </svg>
);
