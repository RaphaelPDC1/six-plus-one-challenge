from pathlib import Path
from PIL import Image, ImageOps

src = Path('/home/ubuntu/webdev-static-assets/six-plus-one-reference-palette-logo-transparent-optimized.webp')
out_dir = Path('/home/ubuntu/six-plus-one-challenge/client/public')
if not src.exists():
    raise FileNotFoundError(f'Missing source logo: {src}')

logo = Image.open(src).convert('RGBA')
for size in (180, 192, 512):
    canvas = Image.new('RGBA', (size, size), (13, 13, 13, 255))
    # Preserve the full mark with comfortable home-screen padding.
    max_box = int(size * 0.78)
    fitted = ImageOps.contain(logo, (max_box, max_box), Image.Resampling.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.alpha_composite(fitted, (x, y))
    canvas.convert('RGB').save(out_dir / f'app-icon-{size}.png', optimize=True)
print('Generated PWA icons:', ', '.join(str(out_dir / f'app-icon-{s}.png') for s in (180, 192, 512)))
