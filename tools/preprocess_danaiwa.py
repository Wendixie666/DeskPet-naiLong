"""将 Codex v2 大奶蛙图集转换为项目现有的横向透明 Sprite Sheet。"""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "素材/大奶蛙/spritesheet.webp"
OUTPUT = ROOT / "素材/大奶蛙/processed"
CELL_WIDTH = 192
CELL_HEIGHT = 208

ACTIONS = {
    "idle.processed.png": (0, 6),
    "walk.processed.png": (1, 8),
    "wave.processed.png": (3, 4),
    "jumping.processed.png": (4, 5),
    "failed.processed.png": (5, 8),
    "waiting.processed.png": (6, 6),
    "typing.processed.png": (7, 6),
    "review.processed.png": (8, 6),
    "look-up.processed.png": (9, 8),
    "look-down.processed.png": (10, 8),
    "drag.processed.png": (0, 1),
    "window-perch.processed.png": (0, 1),
}


def process_row(source: Image.Image, row: int, frame_count: int) -> Image.Image:
    frames = [
        source.crop((index * CELL_WIDTH, row * CELL_HEIGHT,
                     (index + 1) * CELL_WIDTH, (row + 1) * CELL_HEIGHT))
        for index in range(frame_count)
    ]
    boxes = [frame.getchannel("A").getbbox() for frame in frames]
    if any(box is None for box in boxes):
        raise ValueError(f"第 {row} 行包含空帧")

    widths = [box[2] - box[0] for box in boxes if box is not None]
    heights = [box[3] - box[1] for box in boxes if box is not None]
    frame_width = max(widths)
    frame_height = max(heights)
    result = Image.new(
        "RGBA",
        (frame_width * frame_count, frame_height),
        (0, 0, 0, 0),
    )
    for index, (frame, box) in enumerate(zip(frames, boxes)):
        assert box is not None
        cropped = frame.crop(box)
        x = index * frame_width + (frame_width - cropped.width) // 2
        y = frame_height - cropped.height
        result.alpha_composite(cropped, (x, y))
    return result


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, (row, frame_count) in ACTIONS.items():
        output = OUTPUT / name
        process_row(source, row, frame_count).save(output)
        print(f"已生成 {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
