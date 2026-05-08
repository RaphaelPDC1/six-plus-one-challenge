from pathlib import Path
from PIL import Image

# Browser tool captures and their scroll positions.
frames = [
    (0, Path('/home/ubuntu/screenshots/3000-icm09c6z6vb2n65_2026-05-08_08-35-50_3380.webp')),
    (700, Path('/home/ubuntu/screenshots/3000-icm09c6z6vb2n65_2026-05-08_08-38-49_2087.webp')),
    (1189, Path('/home/ubuntu/screenshots/3000-icm09c6z6vb2n65_2026-05-08_08-37-20_7804.webp')),
]

loaded = [(y, Image.open(p).convert('RGB'), p) for y, p in frames]
width = min(img.width for _, img, _ in loaded)
viewport_h = loaded[0][1].height
page_h = 1189 + viewport_h
preview_bar_h = 34  # fixed browser preview warning strip at bottom of screenshots

canvas = Image.new('RGB', (width, page_h - preview_bar_h), (5, 5, 5))

# Use each frame only until the next frame begins. Crop the bottom preview warning from every segment.
for idx, (scroll_y, img, _) in enumerate(loaded):
    next_scroll = loaded[idx + 1][0] if idx + 1 < len(loaded) else page_h
    src_start = 0
    src_end = min(next_scroll - scroll_y, img.height - preview_bar_h, canvas.height - scroll_y)
    if src_end > src_start:
        canvas.paste(img.crop((0, src_start, width, src_end)), (0, scroll_y))

out_dir = Path('/home/ubuntu/six-plus-one-challenge/handoff')
out_dir.mkdir(exist_ok=True)
out_path = out_dir / 'overview-page-long-screenshot.png'
canvas.save(out_path, quality=95)
print(out_path)
print(f'{canvas.width}x{canvas.height}')
