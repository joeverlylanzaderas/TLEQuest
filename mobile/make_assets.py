from PIL import Image
from pathlib import Path

SRC = Path('assets/images/tlequest-logo.png')
OUT = Path('assets/images')
CREAM = (242, 228, 196)   # #F2E4C4 splash / icon background
WHITE = (255, 255, 255)     # #FFFFFF adaptive background

logo = Image.open(SRC).convert('RGBA')
bbox = logo.getbbox()           # trim empty transparent edges
logo = logo.crop(bbox)

def fit(img, box):
    w, h = img.size
    s = box / max(w, h)
    return img.resize((int(w * s), int(h * s)), Image.LANCZOS)

def center(canvas, img):
    x = (canvas.width - img.width) // 2
    y = (canvas.height - img.height) // 2
    canvas.alpha_composite(img, (x, y))
    return canvas

# icon.png: solid cream, logo ~72% of the width, no alpha
icon = Image.new('RGBA', (1024, 1024), CREAM + (255,))
center(icon, fit(logo, int(1024 * 0.72))).convert('RGB').save(OUT / 'icon.png')

# adaptive-icon.png: transparent, logo inside the 66% safe zone
ada = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
center(ada, fit(logo, int(1024 * 0.55))).save(OUT / 'adaptive-icon.png')

# splash-icon.png: transparent, logo ~60% of canvas
sp = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
center(sp, fit(logo, int(1024 * 0.60))).save(OUT / 'splash-icon.png')

# favicon.png
fav = Image.new('RGBA', (256, 256), CREAM + (255,))
center(fav, fit(logo, 220)).save(OUT / 'favicon.png')
print('done')