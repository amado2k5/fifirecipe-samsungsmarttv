#!/usr/bin/env python3
"""
Generates the Tizen launcher icon and the Samsung TV Seller Office images.

  tizen/icon.png                 512x423 launcher icon (config.xml <icon>)
  store/icon-512x423.png         Seller Office legacy icon (PNG, <=300 KB)
  store/logo-1920x1080.png       Seller Office app logo, transparent RGBA (<=300 KB)
  store/background-1920x1080.jpg Seller Office background (<=300 KB)
  store/screenshots/*.jpg        4+ screenshots 1920x1080 JPG (<=500 KB) from build/smoke/

Needs Pillow. Run after `npm run build` + the smoke test (for screenshots):
  python3 scripts/store-assets.py
"""
import glob, io, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMBLEM = os.path.join(ROOT, 'public', 'logo.png')
PAPER, LEAF, INK = (253, 244, 227), (77, 148, 38), (67, 49, 31)


def font(size, weight='800'):
    for path in [f'/Users/{os.environ.get("USER","")}/Documents/GitHub/fifirecipes-android/app/src/main/res/font/plusjakartasans_{weight}.ttf',
                 '/Library/Fonts/Arial Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
                 '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def paper(w, h):
    img = Image.new('RGB', (w, h), PAPER)
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((int(w * .55), -int(h * .6), int(w * 1.3), int(h * .45)), fill=(255, 205, 130, 130))
    g.ellipse((-int(w * .3), int(h * .55), int(w * .35), int(h * 1.5)), fill=(196, 230, 160, 130))
    glow = glow.filter(ImageFilter.GaussianBlur(min(w, h) // 6))
    img.paste(glow, (0, 0), glow)
    return img


def save_under(img, path, limit_kb, fmt):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if fmt == 'JPEG':
        for q in range(92, 50, -4):
            buf = io.BytesIO(); img.convert('RGB').save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
            if buf.tell() <= limit_kb * 1024: break
    else:
        buf = io.BytesIO(); img.save(buf, 'PNG', optimize=True)
        if buf.tell() > limit_kb * 1024:
            # Fit the Seller Office size limit by reducing colours, but keep the
            # original pixel format (the logo must stay 32-bit RGBA).
            mode = img.mode
            q = img.quantize(256, method=Image.Quantize.FASTOCTREE if mode == 'RGBA' else Image.Quantize.MEDIANCUT)
            buf = io.BytesIO(); q.convert(mode).save(buf, 'PNG', optimize=True)
    assert buf.tell() <= limit_kb * 1024, (path, buf.tell())
    open(path, 'wb').write(buf.getvalue())
    print(f'{os.path.relpath(path, ROOT)}  {img.size[0]}x{img.size[1]}  {buf.tell() // 1024} KB')


emblem = Image.open(EMBLEM).convert('RGBA')

# 512x423 launcher/legacy icon: emblem centred on the cream paper.
icon = paper(512, 423).convert('RGBA')
e = emblem.copy(); e.thumbnail((330, 330), Image.LANCZOS)
icon.paste(e, ((512 - e.width) // 2, (423 - e.height) // 2 - 10), e)
save_under(icon.convert('RGB'), os.path.join(ROOT, 'tizen', 'icon.png'), 300, 'PNG')
save_under(icon.convert('RGB'), os.path.join(ROOT, 'store', 'icon-512x423.png'), 300, 'PNG')

# 1920x1080 logo (transparent): emblem + wordmark, composited by Smart Hub over the background.
logo = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
e = emblem.copy(); e.thumbnail((520, 520), Image.LANCZOS)
logo.paste(e, ((1920 - e.width) // 2, 170), e)
d = ImageDraw.Draw(logo); f = font(128)
w1 = d.textlength('FiFi ', font=f); w2 = d.textlength('Recipes', font=f); x = (1920 - w1 - w2) / 2
d.text((x, 730), 'FiFi ', font=f, fill=INK + (255,)); d.text((x + w1, 730), 'Recipes', font=f, fill=LEAF + (255,))
save_under(logo, os.path.join(ROOT, 'store', 'logo-1920x1080.png'), 300, 'PNG')

# 1920x1080 background: the app's warm paper canvas. Smart Hub centres the
# logo on it, so it stays calm (no photo) to keep the wordmark readable.
bg = paper(1920, 1080)
save_under(bg, os.path.join(ROOT, 'store', 'background-1920x1080.jpg'), 300, 'JPEG')

# Screenshots from the TV smoke test (real 1920x1080 renders on Chromium 85).
wanted = ['02-home', '03-recipe', '05-kids', '06-search', '07-home-arabic', '01-language']
for i, name in enumerate(wanted, 1):
    src = os.path.join(ROOT, 'build', 'smoke', f'{name}.png')
    if os.path.exists(src):
        save_under(Image.open(src).convert('RGB'), os.path.join(ROOT, 'store', 'screenshots', f'{i:02d}-{name[3:]}.jpg'), 500, 'JPEG')
