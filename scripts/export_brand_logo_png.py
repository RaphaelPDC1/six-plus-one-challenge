from pathlib import Path
from PIL import Image

src = Path('/home/ubuntu/webdev-static-assets/six-plus-one-brand-logo-white-strong.webp')
out = Path('/home/ubuntu/webdev-static-assets/six-plus-one-brand-logo-white-strong.png')

img = Image.open(src).convert('RGBA')
# Preserve transparency, trim extreme empty padding if present, and export PNG for broad favicon/header compatibility.
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)
img.save(out, 'PNG', optimize=True)
print(out)
