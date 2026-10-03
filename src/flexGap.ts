/**
 * Flex `gap` arrived in Chromium 84; 2020–2021 Samsung TVs (M69/M76) lack it.
 * Measure it once and tag <html> so the build's margin fallback
 * (vite.config.ts › flexGapFallback) takes over on those engines.
 */
export function detectFlexGap(): void {
  const probe = document.createElement('div');
  probe.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
  probe.appendChild(document.createElement('div'));
  probe.appendChild(document.createElement('div'));
  document.documentElement.appendChild(probe);
  const supported = probe.scrollHeight === 1;
  document.documentElement.removeChild(probe);
  if (!supported) document.documentElement.classList.add('no-flex-gap');
}
