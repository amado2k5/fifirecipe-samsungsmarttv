import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import postcss from 'postcss';
import postcssPresetEnv from 'postcss-preset-env';
import { defineConfig, type Plugin } from 'vite';

/**
 * Oldest supported TV web engine: 2022 Samsung TVs (Tizen 6.5) ship Chromium
 * M85. Samsung's model-year table: 2022 M85 · 2023 M94 · 2024 M108 ·
 * 2025 M120 · 2026 M130 (developer.samsung.com › Web Engine Specifications).
 */
const TV_BROWSERS = ['chrome >= 85'];

/**
 * Makes the build loadable by the Tizen web runtime:
 *  - packaged apps run from file://, where Chromium refuses ES-module scripts
 *    (origin "null" CORS), so the bundle is a single classic IIFE loaded with
 *    `defer` instead of `type="module"`;
 *  - Tailwind v4 emits CSS for Chrome 111+: cascade layers (M99), :is()/:where()
 *    (M88) and logical shorthands such as padding-inline/inset (M87) are
 *    lowered with postcss-preset-env for Chromium 85.
 */
/**
 * :where() is Chromium 88+; unknown pseudo-classes drop the whole rule on
 * older engines (e.g. Tailwind's `[hidden]:where(:not([hidden=until-found]))`).
 * Unwrap it: a single selector inlines, a list becomes :-webkit-any(), which
 * Chromium has supported since forever. Only preflight rules use :where(),
 * so the small specificity change is harmless.
 */
const unwrapWhere: import('postcss').Plugin = {
  postcssPlugin: 'fifi-unwrap-where',
  Rule(rule) {
    if (!rule.selector.includes(':where(')) return;
    rule.selector = rule.selector.replace(/:where\(((?:[^()]|\([^()]*\))*)\)/g, (_m, inner: string) =>
      /,(?![^()]*\))/.test(inner) ? `:-webkit-any(${inner})` : inner,
    );
  },
};

function tizenCompat(): Plugin {
  return {
    name: 'fifi:tizen-compat',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => html.replace(/<script type="module" crossorigin/g, '<script defer').replace(/ crossorigin(?=[ >])/g, ''),
    },
    generateBundle: {
      // After vite:css-post has emitted the stylesheet asset.
      order: 'post',
      async handler(_opts, bundle) {
        const processor = postcss([
        postcssPresetEnv({
          browsers: TV_BROWSERS,
          stage: 2,
          features: {
            'cascade-layers': true,
            'is-pseudo-class': true,
            'logical-properties-and-values': true,
          },
        }),
        unwrapWhere,
      ]);
        for (const file of Object.values(bundle)) {
          if (file.type === 'asset' && file.fileName.endsWith('.css')) {
            const result = await processor.process(String(file.source), { from: file.fileName });
            file.source = result.css;
          }
        }
      },
    },
  };
}

export default defineConfig({
  // Relative asset paths: the same build runs packaged (file://) and hosted.
  base: './',
  plugins: [react(), tailwindcss(), tizenCompat()],
  build: {
    target: 'chrome85',
    cssTarget: 'chrome85',
    modulePreload: false,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true },
    },
  },
});
