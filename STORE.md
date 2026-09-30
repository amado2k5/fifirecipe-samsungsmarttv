# Samsung TV Seller Office submission — FiFi Recipes 1.0

Step by step, with every answer. Portal: https://seller.samsungapps.com/tv

## 0. Accounts and certificates (one time)

| Step | Notes |
|------|-------|
| Samsung account | Any Samsung account; used for Seller Office *and* certificate creation. |
| Seller Office membership | Sign up → account type **Individual** (no registration number) or **Company or Business** (DUNS/VAT/EIN etc.). Membership starts as a **Public** seller. |
| Where you can launch | **Public sellers can publish only in the United States.** To launch in Egypt, the GCC, Europe or elsewhere, sign an offline contract with Samsung (HQ or local subsidiary) and submit a **partnership request** in Seller Office — plan this in parallel. |
| Samsung certificate | Tizen Studio 6.1 → Package Manager → *Extension SDK*: install **TV Extensions** and **Samsung Certificate Extension** → Tools › Certificate Manager › **+** › **Samsung** › device type **TV** → create author certificate (sign in with the Samsung account) → distributor certificate, privilege **Public**, add your test TV's **DUID**. Keep `author.p12` + password forever: every update must use the **same author certificate**. |
| CI signing (optional) | Repo secrets `SAMSUNG_AUTHOR_P12_BASE64`, `SAMSUNG_DISTRIBUTOR_P12_BASE64` (`base64 -i file.p12`), `SAMSUNG_CERT_PASSWORD` (and `SAMSUNG_DISTRIBUTOR_PASSWORD` if different). The workflow then uploads a Samsung-signed `.wgt` artifact. |

## 1. Build the submission package

```bash
npm ci && npm run build
SAMSUNG_AUTHOR_P12=author.p12 SAMSUNG_DISTRIBUTOR_P12=distributor.p12 \
  TIZEN_CERT_PASSWORD=... scripts/tizen-profile.sh
npm run package            # → build/FifiRecipes-1.0.0.wgt (signed)
```

Or download the `fifi-recipes-wgt-samsung` artifact from the latest `main`
run of *Build, test & deploy* once the secrets exist.

Test it on a real TV first (PLAN.md §3).

## 2. Register the application

Seller Office › Applications › **Create App**.

| Field | Value |
|-------|-------|
| App title (default language English) | **FiFi Recipes** — must match `<name>` in config.xml |
| Platform / device | Tizen · TV |
| Package | upload `FifiRecipes-1.0.0.wgt` |
| Tizen ID / package ID | `FiFiCookTV.FifiRecipes` / `FiFiCookTV` (from config.xml) |
| Version | 1.0.0 (bump `package.json` for every re-submission) |
| Model groups | **2022, 2023, 2024, 2025, 2026** (Tizen 6.5+; older TVs are phase 2) |
| Countries | **United States** (Public seller); add others after partnership |
| Category | Lifestyle (or the closest food/cooking category offered) |
| Age rating | All ages — no violence, no user-generated content, no purchases |
| Price | Free · no in-app purchases · no ads |
| Privacy policy URL | https://samsungsmarttv.fifi.cooking/privacy.html |
| Support e-mail | **samsungtv@fifi.cooking** (create the mailbox, or change it in `site/` and `tizen/config.xml`) |
| Support URL | https://samsungsmarttv.fifi.cooking/support.html |
| Test account | Not needed — no login |

### Title & descriptions

**English**
- Title: `FiFi Recipes`
- Short: `Dr. Fatma's Egyptian family recipes in 24 languages, with a Kids cooking mode.`
- Description:

  > Dr. Fatma's beloved Egyptian home cooking, on the big screen. Browse more than a thousand family recipes by chapter, search with the on-screen keyboard, and follow clear ingredient lists and numbered steps from across the kitchen — in 24 languages, including Arabic, Urdu and other right-to-left languages.
  >
  > Kids mode turns cooking into a family activity: illustrated recipes, a get-ready checklist, allergen warnings, grown-up alerts, big step cards and a celebration when the dish is done. Recipe videos play full screen, and the Play/Pause and Stop keys on your remote work as you'd expect.
  >
  > No account, no ads, no tracking. An internet connection is required.

**Arabic (عربي)**
- Title: `وصفات فيفي`
- Short: `وصفات د. فاطمة المصرية البيتي بـ٢٤ لغة، ووضع طبخ ممتع للأطفال.`
- Description:

  > أكلات د. فاطمة المصرية البيتي المحبوبة على شاشة التلفزيون الكبيرة. اتصفح أكتر من ألف وصفة عائلية حسب الأبواب، دوّر بالكيبورد اللي على الشاشة، واتبع المكونات والخطوات المرقمة بوضوح من أي مكان في المطبخ — بـ٢٤ لغة منها العربي والأردو.
  >
  > وضع الأطفال بيخلي الطبخ نشاط للعيلة كلها: وصفات مرسومة، قايمة «جهّز نفسك»، تنبيهات الحساسية، تنبيه للخطوات اللي محتاجة حد كبير، كروت خطوات كبيرة، واحتفال لما الأكلة تخلص. فيديوهات الوصفات بتشتغل على الشاشة كلها، وأزرار التشغيل والإيقاف في الريموت شغالة.
  >
  > من غير حساب، من غير إعلانات، ومن غير تتبع. محتاج اتصال بالإنترنت.

### Images (all in `store/`)

| Seller Office field | File | Spec |
|---------------------|------|------|
| App icon 1920×1080 — logo | `logo-1920x1080.png` | 32-bit RGBA PNG, transparent, ≤ 300 KB |
| App icon 1920×1080 — background | `background-1920x1080.jpg` | 1920×1080 JPG, ≤ 300 KB |
| App icon 512×423 | `icon-512x423.png` | PNG, ≤ 300 KB |
| Screenshots (4 required) | `screenshots/01-home.jpg`, `02-recipe.jpg`, `03-kids.jpg`, `04-search.jpg` (+ `05-home-arabic.jpg` for the Arabic listing) | 1920×1080 JPG, ≤ 500 KB |

Regenerate after UI changes: `npm run build`, run the smoke test (screens
land in `build/smoke/`), then `python3 scripts/store-assets.py`.

### Application UI Description (upload as PDF)

Explain the remote flow for the certification team:

1. First launch: language picker (arrows + OK). Later launches open Home.
2. Home: top menu (Home, Chapters, Search, Kids, Settings) and recipe rails;
   OK opens a recipe; Return goes back; **Return on Home exits to Smart Hub**.
3. Recipe: scroll with ↑/↓; OK on a video opens the full-screen player;
   Play/Pause, Stop and Return control it.
4. Search: on-screen keyboard; results appear as you type; "no results"
   message for unmatched words.
5. Kids: filter chips, recipe → "Get ready" checklist → step cards (←/→) →
   celebration.
6. Settings: language, about, version.
7. Network loss shows a banner; the app recovers automatically on reconnect.
   Exit closes the app immediately.

## 3. Certification

Submit → pre-test (package, privileges, config) → QA certification on real
TVs against the Development Checklist (Common). Typical defects to
double-check first: Return on Home must exit; Exit must close without a
popup; network cable pull must show a message and recover; the video must
pause when you press the Home/Smart Hub key and resume cleanly. Fix, bump
the version, resubmit. After approval the app publishes on the chosen date.
