from pathlib import Path

from PIL import Image, ImageFilter

source_candidates = [
    Path("/home/ubuntu/upload/IMG_1069.webp"),
    Path("/home/ubuntu/webdev-static-assets/IMG_1069.webp"),
]
source = next((path for path in source_candidates if path.exists()), None)
if source is None:
    raise FileNotFoundError("Could not find uploaded IMG_1069.webp logo source")

out_dir = Path("/home/ubuntu/webdev-static-assets")
out_dir.mkdir(parents=True, exist_ok=True)
output = out_dir / "six-plus-one-brand-logo-white-strong.webp"

image = Image.open(source).convert("RGBA")
width, height = image.size
pixels = image.load()

# Identify the non-black logo artwork from the uploaded file and crop away excess empty padding.
xs: list[int] = []
ys: list[int] = []
mask_values = []
for y in range(height):
    row = []
    for x in range(width):
        r, g, b, a = pixels[x, y]
        value = max(r, g, b)
        is_logo = a > 0 and value > 8
        if is_logo:
            xs.append(x)
            ys.append(y)
        row.append(value if is_logo else 0)
    mask_values.append(row)

if xs and ys:
    padding_x = int(width * 0.035)
    padding_y = int(height * 0.04)
    left = max(min(xs) - padding_x, 0)
    top = max(min(ys) - padding_y, 0)
    right = min(max(xs) + padding_x + 1, width)
    bottom = min(max(ys) + padding_y + 1, height)
else:
    left, top, right, bottom = 0, 0, width, height

cropped = image.crop((left, top, right, bottom))
cw, ch = cropped.size
out = Image.new("RGBA", (cw, ch), (255, 255, 255, 0))
out_pixels = out.load()
cropped_pixels = cropped.load()

for y in range(ch):
    for x in range(cw):
        r, g, b, a = cropped_pixels[x, y]
        value = max(r, g, b)
        if a > 0 and value > 8:
            # Convert the colored logo into a clearly white mark for the dark UI.
            # The uploaded source is very dark, so alpha must be driven by the mask,
            # not by the original purple/blue brightness.
            edge_alpha = min(255, max(0, int((value - 8) * 18)))
            alpha = max(218, edge_alpha)
            out_pixels[x, y] = (255, 255, 255, alpha)

# Slightly soften only the very edge so the converted logo stays crisp and visibly white.
alpha = out.getchannel("A").filter(ImageFilter.GaussianBlur(radius=0.18))
out.putalpha(alpha)
out.save(output, format="WEBP", quality=96, method=6)
print(output)
