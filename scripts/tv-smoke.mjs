#!/usr/bin/env node
/**
 * TV smoke test on a real old Chromium — the web engine of the oldest
 * supported Samsung TVs (2022, Tizen 6.5 = Chromium M85).
 *
 * Loads dist/index.html from file:// exactly like the packaged Tizen app,
 * injects a mock `tizen` object, drives the UI with remote keyCodes over the
 * DevTools protocol (arrows, Enter, Return 10009) and fails on any JS error,
 * missing screen or broken layout. Screenshots land in build/smoke/.
 *
 *   CHROME=/path/to/chromium node scripts/tv-smoke.mjs
 *
 * CI downloads Chromium snapshot 782782 (85.0.4183) for this; locally any
 * Chromium works (macOS: prefix with `arch -x86_64` for the x64 snapshot).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const chrome = process.env.CHROME;
if (!chrome) {
  console.error('Set CHROME to a Chromium binary (e.g. the M85 snapshot).');
  process.exit(2);
}
const shots = join(root, 'build', 'smoke');
mkdirSync(shots, { recursive: true });
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'fifi-tv-'));

const args = [
  '--headless',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-scrollbars',
  '--autoplay-policy=no-user-gesture-required',
  '--lang=en-US',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--window-size=1920,1080',
  'about:blank',
];
const [cmd, ...pre] = chrome.split(' ');
const proc = spawn(cmd, [...pre, ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
proc.stderr.on('data', () => {});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.error(`✗ ${msg}`);
};

async function connect() {
  for (let i = 0; i < 100; i++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = pages.find((p) => p.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  throw new Error('Chromium did not start');
}

const ws = new WebSocket(await connect());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    fail(`JS exception: ${d.exception?.description ?? d.text}`);
  } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    const e = msg.params.entry;
    // Remote images/fonts can 404 transiently; script/CSS errors cannot.
    if (!/\.(jpg|jpeg|png|webp|woff2?)(\?|$)/.test(e.url ?? '')) fail(`console error: ${e.text} ${e.url ?? ''}`);
  }
});
const send = (method, params = {}) =>
  new Promise((r) => {
    const id = ++seq;
    pending.set(id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;

async function key(code, name) {
  const base = { windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, key: name, code: name };
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await sleep(350);
}
const K = { left: [37, 'ArrowLeft'], up: [38, 'ArrowUp'], right: [39, 'ArrowRight'], down: [40, 'ArrowDown'], enter: [13, 'Enter'], back: [10009, 'XF86Back'] };
const press = (k, n = 1) => (async () => { for (let i = 0; i < n; i++) await key(...K[k]); })();

async function waitFor(expr, label, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await evaluate(expr)) return true;
    await sleep(400);
  }
  fail(`timed out waiting for ${label}`);
  return false;
}
const focused = () => evaluate(`(document.querySelector('.focusable.focused')||{}).dataset?.focusKey || ''`);
async function shot(name) {
  const { result } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(shots, `${name}.png`), Buffer.from(result.data, 'base64'));
}

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
// Minimal Tizen web runtime stand-in: records registered keys and exit().
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__tv = { keys: [], exited: 0 };
    window.tizen = {
      tvinputdevice: {
        getSupportedKeys: () => ['MediaPlayPause','MediaPlay','MediaPause','MediaStop','MediaRewind','MediaFastForward'].map((name, i) => ({ name, code: 1000 + i })),
        registerKey: (k) => window.__tv.keys.push(k),
      },
      application: { getCurrentApplication: () => ({ exit: () => { window.__tv.exited++; }, hide() {} }) },
    };`,
});

const version = (await send('Browser.getVersion')).result.product;
console.log(`Engine: ${version}`);
await send('Page.navigate', { url: pathToFileURL(join(root, 'dist', 'index.html')).href });

// 1. First run → language picker, focus on a language tile.
await waitFor(`!!document.querySelector('[data-focus-key="lang-en"]')`, 'language picker');
await waitFor(`!!document.querySelector('.focusable.focused')`, 'initial focus');
await shot('01-language');
const keys = await evaluate('window.__tv.keys');
if (!keys?.includes('MediaPlayPause')) fail(`media keys not registered: ${JSON.stringify(keys)}`);

// Layout sanity: 5% overscan safe area and flex gap must compute as designed.
const layout = await evaluate(`(() => {
  const safe = getComputedStyle(document.querySelector('.tv-safe'));
  return { top: safe.top, left: safe.left, stage: getComputedStyle(document.querySelector('.tv-stage')).width };
})()`);
if (layout?.top !== '54px' || layout?.left !== '96px' || layout?.stage !== '1920px') fail(`layout broken: ${JSON.stringify(layout)}`);

// 2. Pick English → Home with the featured rail focused.
for (let i = 0; i < 30 && (await focused()) !== 'lang-en'; i++) await press('right');
if ((await focused()) !== 'lang-en') fail(`could not focus lang-en (at ${await focused()})`);
await press('enter');
await waitFor(`!!document.querySelector('[data-focus-key="rk-featured-0"]')`, 'home screen');
await sleep(2500);
await shot('02-home');
if (!(await focused()).startsWith('rk-')) fail(`home focus not on a card: ${await focused()}`);
const gap = await evaluate(`(() => { const a = document.querySelector('[data-focus-key="rk-featured-0"]'), b = document.querySelector('[data-focus-key="rk-featured-1"]'); if (!a || !b) return -1; return Math.round(b.getBoundingClientRect().left - a.getBoundingClientRect().right); })()`);
if (!(gap > 0)) fail(`rail cards touch or overlap (gap ${gap}px) — flex gap/CSS lowering broken`);

// 3. Move along the rail, open a recipe, come back.
await press('right', 2);
await press('enter');
await waitFor(`document.body.innerText.includes('Ingredients')`, 'recipe screen');
await sleep(2500);
await shot('03-recipe');
await press('down', 3);
await shot('04-recipe-scrolled');
await press('back');
await waitFor(`!!document.querySelector('[data-focus-key="rk-featured-0"]')`, 'home after Return');

// 3b. Optional (TV_SMOKE_VIDEO=1, needs the live relay + YouTube): play a
// recipe video through https://samsungsmarttv.fifi.cooking/player.html.
if (process.env.TV_SMOKE_VIDEO) {
  await press('enter'); // featured card 0 has videos (carob drink)
  await waitFor(`!!document.querySelector('[data-focus-key="vid-0"]')`, 'recipe videos rail');
  for (let i = 0; i < 25 && (await focused()) !== 'vid-0'; i++) await press('down');
  if ((await focused()) !== 'vid-0') fail(`could not reach the first video (at ${await focused()})`);
  await press('enter');
  await waitFor(`!!document.querySelector('iframe[src*="samsungsmarttv.fifi.cooking/player.html"]')`, 'relay player iframe');
  await sleep(12000);
  const failedText = await evaluate(`!!document.querySelector('[data-focus-key="video-overlay"] p.text-4xl')`);
  if (failedText) fail('relay reported a YouTube playback error');
  const { result } = await send('Target.getTargets');
  const frames = (result?.targetInfos ?? []).map((t) => t.url).filter((u) => /youtube|player\.html/.test(u));
  console.log(`video frames: ${JSON.stringify(frames)}`);
  await shot('03b-video');
  await press('back'); // closes the overlay
  await waitFor(`!document.querySelector('iframe[src*="player.html"]')`, 'video overlay closed by Return');
  await press('back'); // recipe → home
  await waitFor(`!!document.querySelector('[data-focus-key="rk-featured-0"]')`, 'home after video');
  await press('left', 4);
}

// 4. Top nav → Kids → a kids recipe → Return.
await press('up', 4);
if (!(await focused()).startsWith('nav-')) fail(`top nav not reachable (at ${await focused()})`);
await press('left', 5);
for (let i = 0; i < 6 && (await focused()) !== 'nav-kids'; i++) await press('right');
await press('enter');
await waitFor(`!!document.querySelector('.kids-root')`, 'kids screen');
await sleep(2000);
await shot('05-kids');
await press('back');

// 5. Search with the on-screen keyboard.
await waitFor(`!!document.querySelector('[data-focus-key="rk-featured-0"]')`, 'home before search');
await press('up', 4);
// The nav row may be entered at any tab: walk to the start edge, then forward.
await press('left', 5);
for (let i = 0; i < 6 && (await focused()) !== 'nav-search'; i++) await press('right');
await press('enter');
await waitFor(`!!document.querySelector('[data-focus-key^="osk-"]')`, 'search keyboard');
await sleep(800);
await shot('06-search');
await press('back');

// 6. Return on the main screen exits to Smart Hub (checklist CO-US-05).
await waitFor(`!!document.querySelector('[data-focus-key="rk-featured-0"]')`, 'home before exit');
await press('back');
if ((await evaluate('window.__tv.exited')) < 1) fail('Return on the main screen did not call tizen.application exit()');

// 7. Arabic: right-to-left document.
await evaluate(`localStorage.setItem('fifi-tv:language', 'ar'); location.reload(); true`);
await waitFor(`document.documentElement.dir === 'rtl' && !!document.querySelector('[data-focus-key="rk-featured-0"]')`, 'Arabic home (rtl)');
await sleep(2500);
await shot('07-home-arabic');

ws.close();
proc.kill('SIGKILL');
await new Promise((r) => (proc.exitCode !== null ? r() : proc.once('exit', r)));
rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
if (failures.length) {
  console.error(`\n${failures.length} failure(s) on ${version}`);
  process.exit(1);
}
console.log(`✓ TV smoke test passed on ${version} — screenshots in build/smoke/`);
