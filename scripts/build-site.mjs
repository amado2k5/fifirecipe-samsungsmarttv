#!/usr/bin/env node
/**
 * Assembles the GitHub Pages site for https://samsungsmarttv.fifi.cooking:
 *   /              landing page, privacy policy, support (site/)
 *   /player.html   YouTube relay the packaged TV app embeds (site/player.html)
 *   /app/          the TV web build (dist/) — try it in a desktop browser
 *   /screenshots/  store screenshots
 * Output: build/site/
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'build', 'site');
if (!existsSync(join(root, 'dist', 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'site'), out, { recursive: true });
cpSync(join(root, 'dist'), join(out, 'app'), { recursive: true });
cpSync(join(root, 'store', 'screenshots'), join(out, 'screenshots'), { recursive: true });
console.log(`Site assembled in ${out}`);
