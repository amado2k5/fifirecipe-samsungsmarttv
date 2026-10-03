import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import postcss from 'postcss';
import postcssPresetEnv from 'postcss-preset-env';
import { defineConfig, type Plugin } from 'vite';

/**
 * Oldest supported TV web engine: 2020 Samsung TVs (Tizen 5.5) ship Chromium
 * M69. Samsung's model-year table: 2020 M69 · 2021 M76 · 2022 M85 ·
 * 2023 M94 · 2024 M108 · 2025 M120 · 2026 M130 (developer.samsung.com ›
 * Web Engine Specifications).
 */
const TV_BROWSERS = ['chrome >= 69'];

/**
 * Makes the build loadable by the Tizen web runtime:
 *  - packaged apps run from file://, where Chromium refuses ES-module scripts
 *    (origin "null" CORS), so the bundle is a single classic IIFE loaded with
 *    `defer` instead of `type="module"`;
 *  - Tailwind v4 emits CSS for Chrome 111+: cascade layers (M99), :is()/:where()
 *    (M88) and logical shorthands such as padding-inline/inset (M87) are
 *    lowered with postcss-preset-env for Chromium 69; flex `gap` and the
 *    @property defaults get the fallbacks below.
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

/**
 * Tailwind registers its --tw-* variables with @property (Chromium 85+) and
 * only sets their defaults in a fallback block gated to Safari/Firefox. On
 * Chromium 69–84 those variables stay unset, so anything built from them
 * (border-style, shadows, gradients, transforms) silently drops. Apply the
 * defaults everywhere: they equal the @property initial values.
 */
const propertyDefaults: import('postcss').Plugin = {
  postcssPlugin: 'fifi-property-defaults',
  AtRule: {
    supports(at) {
      if (at.params.includes('-webkit-hyphens') && at.params.includes('-moz-orient')) at.replaceWith(at.nodes ?? []);
    },
  },
};

/**
 * Flex `gap` is Chromium 84+ (2021 TVs and older lack it; grid gap works).
 * For every `.gap-*` utility, emit margin equivalents that apply only under
 * `html.no-flex-gap` (set at startup by src/flexGap.ts). They live in the
 * components layer, so a child's own margin utilities still win.
 */
const flexGapFallback: import('postcss').Plugin = {
  postcssPlugin: 'fifi-flex-gap-fallback',
  Once(root, { postcss: pc }) {
    const out: string[] = [];
    root.walkRules(/^\.gap-[\w\\.]+$/, (rule) => {
      let value = '';
      rule.walkDecls('gap', (d) => {
        value = d.value;
      });
      if (!value) return;
      const c = rule.selector;
      const row = [`.flex${c}`, `.inline-flex${c}`].map((s) => `${s}:not(.flex-col):not(.flex-wrap)>*+*`);
      out.push(
        `.no-flex-gap ${row.join(',.no-flex-gap ')}{margin-left:${value}}`,
        `html.no-flex-gap[dir=rtl] ${row.join(',html.no-flex-gap[dir=rtl] ')}{margin-left:0;margin-right:${value}}`,
        `.no-flex-gap .flex-col${c}>*+*{margin-top:${value}}`,
        `.no-flex-gap .flex-wrap${c}{margin-bottom:calc(${value} * -1)}`,
        `.no-flex-gap .flex-wrap${c}>*{margin-bottom:${value};margin-right:${value}}`,
        `html.no-flex-gap[dir=rtl] .flex-wrap${c}>*{margin-right:0;margin-left:${value}}`,
      );
    });
    if (out.length) root.append(pc.parse(`@layer components{${out.join('')}}`));
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
        propertyDefaults,
        flexGapFallback,
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
    target: 'chrome69',
    cssTarget: 'chrome69',
    modulePreload: false,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true },
    },
  },
});
