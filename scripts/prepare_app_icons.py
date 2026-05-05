from pathlib import Path
from PIL import Image

src = Path('/home/ubuntu/webdev-static-assets/six-plus-one-brand-logo-white-strong.webp')
out_dir = Path('/home/ubuntu/webdev-static-assets')
img = Image.open(src).convert('RGBA')

# Square padded canvas to avoid clipping on maskable/Apple icons.
side = max(img.size)
canvas = Image.new('RGBA', (side, side), (13, 13, 13, 255))
canvas.alpha_composite(img, ((side - img.width) // 2, (side - img.height) // 2))

for size in (180, 192, 512):
    icon = canvas.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(out_dir / f'six-plus-one-app-icon-{size}.png', 'PNG')

print('created', ', '.join(str(out_dir / f'six-plus-one-app-icon-{size}.png') for size in (180, 192, 512)))
