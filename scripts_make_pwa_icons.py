from pathlib import Path
from PIL import Image, ImageOps

# The installed iOS/Android home-screen icon should match the simple orange
# 6+1 app icon style shown by the user, not the dark badge-style logo.
src = Path('/home/ubuntu/webdev-static-assets/six-plus-one-original-uploaded-logo.webp')
out_dir = Path('/home/ubuntu/six-plus-one-challenge/client/public')
if not src.exists():
    raise FileNotFoundError(f'Missing source logo: {src}')

logo = Image.open(src).convert('RGBA')
# Trim transparent padding from the uploaded transparent logo before placing it.
bbox = logo.getbbox()
if bbox:
    logo = logo.crop(bbox)

ORANGE = (255, 91, 0, 255)
for size in (180, 192, 512):
    canvas = Image.new('RGBA', (size, size), ORANGE)
    # Keep a strong, readable mark with enough padding for iOS rounded masks.
    max_box = int(size * 0.56)
    fitted = ImageOps.contain(logo, (max_box, max_box), Image.Resampling.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.alpha_composite(fitted, (x, y))
    canvas.convert('RGB').save(out_dir / f'app-icon-{size}.png', optimize=True)

# Keep the SVG fallback aligned with the same simple orange treatment.
(out_dir / 'app-icon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title">
  <title id="title">6+1</title>
  <rect width="512" height="512" fill="#FF5B00"/>
  <text x="256" y="306" text-anchor="middle" fill="#050505" font-family="Arial Black, Impact, Inter, system-ui, sans-serif" font-size="174" font-weight="900" letter-spacing="-14">6<tspan font-size="122" dx="-3" dy="-18">+</tspan><tspan dx="-2" dy="18">1</tspan></text>
</svg>
''')

print('Generated orange PWA icons:', ', '.join(str(out_dir / f'app-icon-{s}.png') for s in (180, 192, 512)))
