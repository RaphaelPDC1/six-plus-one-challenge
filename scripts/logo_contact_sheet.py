from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

assets = [
    Path('/home/ubuntu/webdev-static-assets/six-plus-one-brand-logo-visible.webp'),
    Path('/home/ubuntu/webdev-static-assets/six-plus-one-brand-logo-white-strong.png'),
    Path('/home/ubuntu/webdev-static-assets/six-plus-one-brand-logo-white-strong.webp'),
    Path('/home/ubuntu/webdev-static-assets/six-plus-one-brand-logo-white.webp'),
    Path('/home/ubuntu/webdev-static-assets/six-plus-one-brand-logo.webp'),
    Path('/home/ubuntu/webdev-static-assets/six-plus-one-app-icon-192.png'),
    Path('/home/ubuntu/upload/IMG_1069.webp'),
]

thumb_w, thumb_h = 260, 220
label_h = 48
cols = 2
rows = (len(assets) + cols - 1) // cols
sheet = Image.new('RGB', (cols * thumb_w, rows * (thumb_h + label_h)), (8, 8, 8))
draw = ImageDraw.Draw(sheet)

for idx, path in enumerate(assets):
    col = idx % cols
    row = idx // cols
    x0 = col * thumb_w
    y0 = row * (thumb_h + label_h)
    draw.rectangle([x0, y0, x0 + thumb_w - 1, y0 + thumb_h + label_h - 1], outline=(55, 55, 55))
    try:
        img = Image.open(path).convert('RGBA')
        img.thumbnail((thumb_w - 28, thumb_h - 28), Image.LANCZOS)
        x = x0 + (thumb_w - img.width) // 2
        y = y0 + (thumb_h - img.height) // 2
        bg = Image.new('RGBA', img.size, (8, 8, 8, 255))
        bg.alpha_composite(img)
        sheet.paste(bg.convert('RGB'), (x, y))
        label = f'{path.name}\n{Image.open(path).size}'
    except Exception as exc:
        label = f'{path.name}\nERROR: {exc}'
    draw.multiline_text((x0 + 8, y0 + thumb_h + 6), label, fill=(225, 225, 225), spacing=2)

out = Path('/home/ubuntu/six-plus-one-challenge/qa/logo-contact-sheet.png')
out.parent.mkdir(parents=True, exist_ok=True)
sheet.save(out)
print(out)
