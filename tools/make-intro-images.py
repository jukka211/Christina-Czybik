"""Makes the tiny photo copies the opening intro uses (intro-grid.js).

Run from the project folder after adding or changing photos in images/:

    python3 tools/make-intro-images.py

Writes images/intro/<name>.jpg: 240px on the long side, JPEG quality 60,
no metadata (about 6KB each). The names are plain ASCII, with the extension
and accents dropped and anything else unusual turned into "_", the same rule
as introUrl() in intro-grid.js. Needs Pillow (pip install Pillow).
"""
import os
import re
import unicodedata

from PIL import Image, ImageOps

SOURCE = "images"
TARGET = os.path.join("images", "intro")
LONG_EDGE_PX = 240
QUALITY = 60


def intro_name(file_name):
    base = re.sub(r"\.[^.]+$", "", file_name)
    base = "".join(c for c in unicodedata.normalize("NFD", base) if not ("̀" <= c <= "ͯ"))
    return re.sub(r"[^A-Za-z0-9._-]", "_", base) + ".jpg"


def main():
    os.makedirs(TARGET, exist_ok=True)
    written = {}
    for file_name in sorted(os.listdir(SOURCE)):
        path = os.path.join(SOURCE, file_name)
        if file_name.startswith(".") or not os.path.isfile(path):
            continue
        name = intro_name(file_name)
        if name in written:
            raise SystemExit(f"{file_name} and {written[name]} would both become {name}")
        written[name] = file_name

        image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
        image.thumbnail((LONG_EDGE_PX, LONG_EDGE_PX), Image.LANCZOS)
        image.save(os.path.join(TARGET, name), "JPEG", quality=QUALITY, optimize=True, progressive=True)

    print(f"{len(written)} intro images written to {TARGET}")


if __name__ == "__main__":
    main()
