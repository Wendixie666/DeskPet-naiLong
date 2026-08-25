"""从素材图生成各平台应用图标到 build/ 目录。

用法：python tools/make_icons.py
依赖：Pillow（python -m pip install Pillow）
输出：
  build/icon.png   1024x1024，Linux（AppImage/deb）与 macOS 兜底
  build/icon.ico   Windows 多尺寸
  build/icon.icns  macOS
"""

from pathlib import Path

from PIL import Image

SOURCE = Path(__file__).resolve().parent.parent / "素材/奶蛙/default.jpeg"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "build"
ICON_SIZES = [16, 24, 32, 48, 64, 128, 256]
PNG_SIZE = 1024


def crop_square(image: Image.Image) -> Image.Image:
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    square = image.crop((left, top, left + side, top + side))
    remove_watermark(square)
    return square.resize((PNG_SIZE, PNG_SIZE), Image.LANCZOS)


def remove_watermark(square: Image.Image) -> None:
    # 右下角水印区域：按列用上方采样色竖向填充，坐标绑定 1440x1418 源图
    x0, y0 = 1060, 1240
    x1 = square.width
    y1 = square.height
    pixels = square.load()
    for x in range(x0, x1):
        color = pixels[x, y0 - 6]
        for y in range(y0, y1):
            pixels[x, y] = color


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    square = crop_square(Image.open(SOURCE).convert("RGB"))

    square.save(OUTPUT_DIR / "icon.png")
    square.save(
        OUTPUT_DIR / "icon.ico",
        sizes=[(size, size) for size in ICON_SIZES],
    )
    square.save(OUTPUT_DIR / "icon.icns")
    print(f"已生成图标到 {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
