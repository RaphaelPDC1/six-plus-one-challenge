from pathlib import Path
from PIL import Image
import numpy as np

paths = [
    Path('/home/ubuntu/screenshots/3000-icm09c6z6vb2n65_2026-05-08_08-35-50_3380.webp'),
    Path('/home/ubuntu/screenshots/3000-icm09c6z6vb2n65_2026-05-08_08-38-49_2087.webp'),
    Path('/home/ubuntu/screenshots/3000-icm09c6z6vb2n65_2026-05-08_08-37-20_7804.webp'),
]
imgs = [Image.open(p).convert('RGB') for p in paths]
width = min(i.width for i in imgs)
# Crop out right scrollbar and fixed bottom preview bar for matching/stitching.
match_w = width - 24
usable_h = imgs[0].height - 34

def prep(img):
    arr = np.asarray(img.crop((20, 0, match_w, usable_h)).convert('L'), dtype=np.float32)
    return arr

arrs = [prep(i) for i in imgs]

def best_offset(a, b, min_off, max_off):
    best = None
    for off in range(min_off, max_off + 1):
        # b is pasted at y=off relative to a. Compare overlapping region.
        y0a = max(0, off)
        y1a = min(a.shape[0], off + b.shape[0])
        if y1a - y0a < 120:
            continue
        y0b = max(0, -off)
        y1b = y0b + (y1a - y0a)
        # Sample every 4 pixels for speed and ignore very dark plain bands less by adding gradients.
        aa = a[y0a:y1a:4, ::4]
        bb = b[y0b:y1b:4, ::4]
        score = np.mean((aa - bb) ** 2)
        if best is None or score < best[0]:
            best = (score, off)
    return best

# Estimate based on browser-reported approximate scrolls but allow a wide range.
off01 = best_offset(arrs[0], arrs[1], 350, 900)[1]
off12_rel = best_offset(arrs[1], arrs[2], 250, 650)[1]
positions = [0, off01, off01 + off12_rel]
print('positions', positions)

canvas_h = positions[-1] + usable_h
canvas = Image.new('RGB', (width, canvas_h), (5, 5, 5))

# Paste only non-overlapping bands using midpoints between estimated positions.
for idx, (pos, img) in enumerate(zip(positions, imgs)):
    start_doc = pos
    end_doc = pos + usable_h
    if idx > 0:
        start_doc = max(start_doc, positions[idx-1] + usable_h)
    # If there is a gap/overlap issue, use half-way seam for smoother continuity.
    if idx > 0:
        start_doc = max(pos, int((positions[idx-1] + usable_h + pos) / 2)) if pos < positions[idx-1] + usable_h else pos
    if idx < len(imgs) - 1:
        next_pos = positions[idx+1]
        end_doc = min(end_doc, int((pos + usable_h + next_pos) / 2)) if next_pos < pos + usable_h else min(end_doc, next_pos)
    if end_doc <= start_doc:
        continue
    src_y0 = start_doc - pos
    src_y1 = end_doc - pos
    canvas.paste(img.crop((0, src_y0, width, src_y1)), (0, start_doc))

out = Path('/home/ubuntu/six-plus-one-challenge/handoff/overview-page-long-screenshot-auto.png')
canvas.save(out, quality=95)
print(out)
print(f'{canvas.width}x{canvas.height}')
