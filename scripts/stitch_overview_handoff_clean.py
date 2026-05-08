from pathlib import Path
from PIL import Image

# Captures and their document scroll positions reported by the browser tool.
# The app header/nav is sticky, so scrolled captures must be cropped below it.
top_path = Path('/home/ubuntu/screenshots/3000-icm09c6z6vb2n65_2026-05-08_08-35-50_3380.webp')
mid_path = Path('/home/ubuntu/screenshots/3000-icm09c6z6vb2n65_2026-05-08_08-38-49_2087.webp')
bottom_path = Path('/home/ubuntu/screenshots/3000-icm09c6z6vb2n65_2026-05-08_08-37-20_7804.webp')

top = Image.open(top_path).convert('RGB')
mid = Image.open(mid_path).convert('RGB')
bottom = Image.open(bottom_path).convert('RGB')
width = min(top.width, mid.width, bottom.width)

# Browser reported: top scroll 0, mid scroll 700 with 489 below, bottom scroll 1189 with 0 below.
page_height = 1189 + bottom.height
canvas = Image.new('RGB', (width, page_height), (5, 5, 5))

# Top viewport: use the real page top through the first viewport.
canvas.paste(top.crop((0, 0, width, top.height)), (0, 0))

# Mid viewport: crop below the sticky header/navigation/preview top overlay.
# Source y=170 roughly corresponds to document y=870. This preserves Rival Pressure transition and pressure-list header.
sticky_crop_y = 170
mid_doc_y = 700 + sticky_crop_y
mid_height = min(mid.height - sticky_crop_y, 1189 - mid_doc_y)
if mid_height > 0:
    canvas.paste(mid.crop((0, sticky_crop_y, width, sticky_crop_y + mid_height)), (0, mid_doc_y))

# Bottom viewport: crop below sticky header and paste to the matching document y.
bottom_crop_y = 170
bottom_doc_y = 1189 + bottom_crop_y
bottom_height = bottom.height - bottom_crop_y
if bottom_height > 0 and bottom_doc_y < page_height:
    canvas.paste(bottom.crop((0, bottom_crop_y, width, min(bottom.height, bottom_crop_y + page_height - bottom_doc_y))), (0, bottom_doc_y))

# Fill any tiny seam with the top/mid source if applicable. This avoids blank gaps between first and mid crops.
# If a small overlap looks imperfect, it is still preferable to duplicated navigation bars in the handoff image.
out_dir = Path('/home/ubuntu/six-plus-one-challenge/handoff')
out_dir.mkdir(exist_ok=True)
out_path = out_dir / 'overview-page-long-screenshot-clean.png'
canvas.save(out_path, quality=95)
print(out_path)
print(f'{canvas.width}x{canvas.height}')
