from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path('/home/ubuntu/webdev-static-assets/six-plus-one-clean-stacked-logo.png')
OUT.parent.mkdir(parents=True, exist_ok=True)

W, H = 420, 620
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

font_paths = [
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Black.otf',
    '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Bold.otf',
]
font_path = next(Path(p) for p in font_paths if Path(p).exists())
num_font = ImageFont.truetype(str(font_path), 230)
plus_font = ImageFont.truetype(str(font_path), 140)

white = (255, 255, 255, 255)
gold = (200, 169, 110, 255)
shadow = (0, 0, 0, 125)

def centered_text(text, y, font, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (W - tw) / 2
    # subtle fixed shadow for contrast, not animated and not eroded
    draw.text((x + 3, y + 4), text, font=font, fill=shadow)
    draw.text((x, y), text, font=font, fill=fill)

centered_text('6', 10, num_font, white)
centered_text('+', 220, plus_font, gold)
centered_text('1', 330, num_font, white)

# Crop transparent bounds with padding to keep the mark compact.
bbox = img.getbbox()
if bbox:
    pad = 24
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(W, bbox[2] + pad)
    bottom = min(H, bbox[3] + pad)
    img = img.crop((left, top, right, bottom))

img.save(OUT)
print(OUT)
