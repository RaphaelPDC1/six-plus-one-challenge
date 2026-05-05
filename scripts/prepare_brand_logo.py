from pathlib import Path

from PIL import Image, ImageEnhance

source = Path("/home/ubuntu/upload/IMG_1069.webp")
out_dir = Path("/home/ubuntu/webdev-static-assets")
out_dir.mkdir(parents=True, exist_ok=True)
output = out_dir / "six-plus-one-brand-logo-visible.webp"

image = Image.open(source).convert("RGBA")
pixels = image.load()
width, height = image.size

xs = []
ys = []
for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        if a and max(r, g, b) > 8:
            xs.append(x)
            ys.append(y)

if xs and ys:
    padding_x = int(width * 0.035)
    padding_y = int(height * 0.04)
    left = max(min(xs) - padding_x, 0)
    top = max(min(ys) - padding_y, 0)
    right = min(max(xs) + padding_x, width)
    bottom = min(max(ys) + padding_y, height)
    image = image.crop((left, top, right, bottom))

# Preserve the authentic uploaded artwork but make the very dark purple logo legible on the app's black header.
image = ImageEnhance.Brightness(image).enhance(2.8)
image = ImageEnhance.Contrast(image).enhance(1.55)
image = ImageEnhance.Color(image).enhance(1.25)

image.save(output, format="WEBP", quality=92, method=6)
print(output)
