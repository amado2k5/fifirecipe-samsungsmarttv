# FiFi Recipes — Samsung Smart TV

Tizen web app for [fifi.cooking](https://fifi.cooking), the recipe site by
Dr. Fatma / FiFi, for Samsung Smart TVs (2020 and newer). It shares its
code base with the Fire TV app (`fifirecipes-amazonfire`): Vite + React +
TypeScript + Tailwind, D-pad spatial navigation, a fixed 1920×1080 stage,
24 languages with RTL, and the same static JSON API (`docs/tv-api.md` in the
`fifirecipes` repo).

**Plan, platform research and roadmap: [PLAN.md](PLAN.md). Store submission:
[STORE.md](STORE.md).**

- Tizen app id `FiFiCookTV.FifiRecipes` · package `FiFiCookTV` ·
  `required_version` 5.5
- Oldest supported engine: Chromium 69 (2020 TVs, Tizen 5.5)
- Live: https://samsungsmarttv.fifi.cooking (site, privacy, support, YouTube
  relay) · https://samsungsmarttv.fifi.cooking/app/ (web build — arrow keys +
  Enter, Backspace = Return)

## Develop

```bash
npm install
npm run dev          # http://localhost:3000 — view at 1920×1080
npm run lint         # type-check
npm run build        # dist/ — Tizen-ready (Chromium 69, classic script, lowered CSS)
```

Laptop keys map to the remote: arrows, Enter = OK, Backspace/Esc = Return.

## Test on the TV engine

```bash
# Chromium 69 = 2020 TV engine (snapshot 576753), Chromium 85 = 2022 (782782 mac / 782790 linux)
CHROME="arch -x86_64 /path/to/Chromium.app/Contents/MacOS/Chromium" node scripts/tv-smoke.mjs
```

Loads `dist/index.html` from `file://` like the packaged app, with a mock
`tizen` runtime, and drives it with remote keyCodes (Return = 10009).
Screenshots in `build/smoke/`. CI runs the same test on Linux.
Add `TV_SMOKE_VIDEO=1` to also play a recipe video through the live YouTube
relay (needs network; kept out of CI so YouTube outages can't fail builds).

## Package (.wgt)

Needs the Tizen Studio CLI (`web-cli_Tizen_Studio_6.1_*.bin`) and Java 17.

```bash
# once: dev certificate (emulator) or Samsung certificates (TV / Seller Office)
TIZEN_CERT_PASSWORD=... scripts/tizen-profile.sh --dev
SAMSUNG_AUTHOR_P12=author.p12 SAMSUNG_DISTRIBUTOR_P12=distributor.p12 TIZEN_CERT_PASSWORD=... scripts/tizen-profile.sh

npm run build && npm run package   # → build/FifiRecipes-<version>.wgt (fails if unsigned)
```

`npm run package` signs with the `fifi-samsung` profile (Samsung TV profile
from Certificate Manager — the one Seller Office accepts) when it is
registered, otherwise `fifi`; override with `TIZEN_PROFILE=…`. It warns when
the result is only dev-signed. `tizen-profile.sh` refuses to overwrite a
`profiles.xml` that holds other profiles (`TIZEN_PROFILE_FORCE=1` to replace).

Install on a TV in Developer Mode: `sdb connect <tv-ip>`, then
`tizen install -n build/FifiRecipes-1.0.0.wgt -t <device>` and
`tizen run -p FiFiCookTV.FifiRecipes -t <device>`.

## Samsung-specific pieces

| File | Purpose |
|------|---------|
| `tizen/config.xml` | widget manifest: ids, version, TV profile, privileges (`internet`, `tv.inputdevice`), landscape, no pointer |
| `tizen/icon.png` | 512×423 launcher icon |
| `src/platform.ts` | media-key registration, exit to Smart Hub, visibility + connectivity events |
| `src/remote.ts` | Tizen keyCodes (Return 10009, media keys) |
| `src/components/VideoOverlay.tsx` + `site/player.html` | YouTube via an HTTPS relay page (file:// apps have no referrer) |
| `vite.config.ts` | Chromium 69 target, IIFE bundle, PostCSS lowering of Tailwind v4 CSS, flex-gap fallback |
| `scripts/tv-smoke.mjs` | Chromium 69/85 remote-control test |
| `scripts/package-wgt.mjs`, `scripts/tizen-profile.sh` | signed `.wgt` packaging |
| `scripts/build-site.mjs`, `site/` | GitHub Pages site |
| `scripts/store-assets.py`, `store/` | Seller Office images |

## CI/CD

`.github/workflows/build-deploy.yml` — every PR and push: type-check, build,
Chromium 69 + 85 smoke tests, signed `.wgt` artifact (Samsung-signed when the
`SAMSUNG_*` secrets exist, dev-signed otherwise). Every merge to `main` also
deploys `build/site/` to https://samsungsmarttv.fifi.cooking.
