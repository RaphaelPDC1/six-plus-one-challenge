from pathlib import Path
from PIL import Image

ORANGE = (255, 91, 0)
out_dir = Path('/home/ubuntu/six-plus-one-challenge/client/public')
for size in (180, 192, 512):
    path = out_dir / f'app-icon-{size}.png'
    img = Image.open(path).convert('RGB')
    pixels = img.load()
    xs = []
    ys = []
    non_orange = 0
    total = size * size
    for y in range(size):
        for x in range(size):
            r, g, b = pixels[x, y]
            if abs(r - ORANGE[0]) + abs(g - ORANGE[1]) + abs(b - ORANGE[2]) > 40:
                non_orange += 1
                xs.append(x)
                ys.append(y)
    bbox = (min(xs), min(ys), max(xs), max(ys)) if xs else None
    width = bbox[2] - bbox[0] + 1 if bbox else 0
    height = bbox[3] - bbox[1] + 1 if bbox else 0
    print(f'{path.name}: logo_bbox={bbox}, width_ratio={width/size:.3f}, height_ratio={height/size:.3f}, non_orange_ratio={non_orange/total:.3f}')
