import React from 'react';
import { Focusable, FocusGroup } from './Focusable';

interface ErrorScreenProps {
  title: string;
  body: string;
  retryLabel: string;
  onRetry: () => void;
}

/** Friendly full-screen failure state — an empty basket. */
export const ErrorScreen: React.FC<ErrorScreenProps> = ({ title, body, retryLabel, onRetry }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper text-center px-40">
    <svg viewBox="0 0 24 24" width={120} height={120} fill="none" stroke="#e8590c" strokeWidth={1.6} className="mb-8">
      <path d="M4.5 10h15l-1.6 8.4a2 2 0 0 1-2 1.6H8.1a2 2 0 0 1-2-1.6Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 10 12 4l3.5 6M9.5 14v3M14.5 14v3" strokeLinecap="round" />
    </svg>
    <h1 className="text-5xl font-extrabold text-ink mb-5">{title}</h1>
    <p className="text-3xl text-ink-dim leading-relaxed mb-12 max-w-4xl">{body}</p>
    <FocusGroup focusKey="error-actions" className="flex gap-6">
      <Focusable focusKey="error-retry" onEnter={onRetry} className="rounded-2xl">
        <span className="block rounded-2xl bg-leaf px-12 py-5 text-3xl font-extrabold text-white shadow-lg">{retryLabel}</span>
      </Focusable>
    </FocusGroup>
  </div>
);
