"""Makes the tiny photo copies the opening intro uses (intro-grid.js).

Run from the project folder after adding or changing photos in the
category folders (after tools/make-row-images.py):

    python3 tools/make-intro-images.py

Writes images/intro/<name>.jpg for every photo in the category folders the
gallery rows read from: 240px on the long side, JPEG quality 60, no metadata
(about 6KB each), and removes intro copies of photos no longer in them. The
names are plain ASCII, with the extension and accents dropped and anything
else unusual turned into "_", the same rule as introUrl() in intro-grid.js.
A photo filed in two folders gets one copy. Needs Pillow (pip install Pillow).
"""
import os
import re
import unicodedata

from PIL import Image, ImageOps

SOURCE = "images"
# Same folders as tools/make-row-images.py.
ROW_FOLDERS = ["Politik", "Veranstaltungen", "Wirtschaft", "Porträt", "Personal_Projects"]
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
    for folder in ROW_FOLDERS:
        folder_path = os.path.join(SOURCE, folder)
        for file_name in sorted(os.listdir(folder_path)):
            path = os.path.join(folder_path, file_name)
            if file_name.startswith(".") or not os.path.isfile(path):
                continue
            name = intro_name(file_name)
            if name in written:
                # The same photo filed in two folders: one copy serves both.
                if os.path.basename(written[name]) == file_name:
                    continue
                raise SystemExit(f"{path} and {written[name]} would both become {name}")
            written[name] = path

            image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
            image.thumbnail((LONG_EDGE_PX, LONG_EDGE_PX), Image.LANCZOS)
            image.save(os.path.join(TARGET, name), "JPEG", quality=QUALITY, optimize=True, progressive=True)

    removed = 0
    for name in os.listdir(TARGET):
        if name.endswith(".jpg") and name not in written:
            os.remove(os.path.join(TARGET, name))
            removed += 1

    print(f"{len(written)} intro images written to {TARGET}, {removed} old ones removed")


if __name__ == "__main__":
    main()
