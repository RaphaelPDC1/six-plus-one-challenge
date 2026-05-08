from pathlib import Path
from PIL import Image, ImageDraw

captures = [
    (0, Path('/home/ubuntu/screenshots/3000-icm09c6z6vb2n65_2026-05-08_08-35-50_3380.webp')),
    (700, Path('/home/ubuntu/screenshots/3000-icm09c6z6vb2n65_2026-05-08_08-38-49_2087.webp')),
    (1189, Path('/home/ubuntu/screenshots/3000-icm09c6z6vb2n65_2026-05-08_08-37-20_7804.webp')),
]

images = []
for y, path in captures:
    if not path.exists():
        raise FileNotFoundError(path)
    img = Image.open(path).convert('RGB')
    images.append((y, img, path))

width = min(img.width for _, img, _ in images)
viewport_height = images[0][1].height
page_height = 1189 + images[-1][1].height
canvas = Image.new('RGB', (width, page_height), (7, 7, 7))

# Paste from bottom to top first, then overlay the most relevant segment ranges to reduce visual gaps.
for y, img, _ in images:
    canvas.paste(img.crop((0, 0, width, img.height)), (0, y))

# Crop out the yellow browser preview warning bar if present at the bottom of each viewport except final page bottom.
# Rebuild the canvas from clean vertical slices that avoid duplicate fixed header as much as possible.
slices = [
    (images[0][1], 0, 0, 700),
    (images[1][1], 0, 700, 1189),
    (images[2][1], 0, 1189, page_height),
]
rebuilt = Image.new('RGB', (width, page_height), (7, 7, 7))
for img, src_y, dst_y, dst_end in slices:
    height = dst_end - dst_y
    rebuilt.paste(img.crop((0, src_y, width, min(src_y + height, img.height))), (0, dst_y))

out_dir = Path('/home/ubuntu/six-plus-one-challenge/handoff')
out_dir.mkdir(exist_ok=True)
out_path = out_dir / 'overview-page-long-screenshot.png'
rebuilt.save(out_path, quality=95)
print(out_path)
print(f'{rebuilt.width}x{rebuilt.height}')
