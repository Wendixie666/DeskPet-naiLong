"""将 Codex v2 大奶蛙图集转换为项目现有的横向透明 Sprite Sheet。"""

from __future__ import annotations

from collections import deque
from pathlib import Path
import colorsys

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "素材/大奶蛙/spritesheet.webp"
LAUGH_SOURCE = ROOT / "素材/大奶蛙/大笑.gif"
OUTPUT = ROOT / "素材/大奶蛙/processed"
CELL_WIDTH = 192
CELL_HEIGHT = 208
BACKGROUND_COMPONENT_MIN_SIZE = 70

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


def is_background_candidate(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, _ = pixel
    _, saturation, value = colorsys.rgb_to_hsv(
        red / 255,
        green / 255,
        blue / 255,
    )
    return saturation <= 0.12 and value >= 0.72


def is_background_halo_candidate(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, _ = pixel
    _, saturation, value = colorsys.rgb_to_hsv(
        red / 255,
        green / 255,
        blue / 255,
    )
    return saturation <= 0.35 and value >= 0.78


def remove_gif_background(frame: Image.Image) -> Image.Image:
    """移除 GIF 背景及贴着透明边缘的浅色光晕。"""

    frame = frame.convert("RGBA")
    width, height = frame.size
    pixels = frame.load()
    candidates = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            if is_background_candidate(pixels[x, y]):
                candidates[y * width + x] = 1

    visited = bytearray(width * height)
    removable = bytearray(width * height)
    halo_sources = bytearray(width * height)
    for start_y in range(height):
        for start_x in range(width):
            start_index = start_y * width + start_x
            if not candidates[start_index] or visited[start_index]:
                continue
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            visited[start_index] = 1
            component = [start_index]
            touches_edge = False
            while queue:
                x, y = queue.popleft()
                if x in (0, width - 1) or y in (0, height - 1):
                    touches_edge = True
                for next_x, next_y in (
                    (x - 1, y),
                    (x + 1, y),
                    (x, y - 1),
                    (x, y + 1),
                ):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue
                    next_index = next_y * width + next_x
                    if candidates[next_index] and not visited[next_index]:
                        visited[next_index] = 1
                        component.append(next_index)
                        queue.append((next_x, next_y))
            component_xs = [index % width for index in component]
            component_ys = [index // width for index in component]
            component_width = max(component_xs) - min(component_xs) + 1
            component_height = max(component_ys) - min(component_ys) + 1
            is_enclosed_arm_gap = (
                len(component) >= 8
                and min(component_ys) >= height * 0.55
                and component_height >= component_width * 2
            )
            if (
                touches_edge
                or len(component) >= BACKGROUND_COMPONENT_MIN_SIZE
                or is_enclosed_arm_gap
            ):
                for index in component:
                    removable[index] = 1
                    if touches_edge or len(component) >= BACKGROUND_COMPONENT_MIN_SIZE:
                        halo_sources[index] = 1

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if removable[index] or not is_background_halo_candidate(pixels[x, y]):
                continue
            neighbors = (
                (x - 1, y),
                (x + 1, y),
                (x, y - 1),
                (x, y + 1),
            )
            if any(
                0 <= next_x < width
                and 0 <= next_y < height
                and halo_sources[next_y * width + next_x]
                for next_x, next_y in neighbors
            ):
                removable[index] = 1

    alpha = Image.new("L", (width, height), 255)
    alpha_pixels = alpha.load()
    for index, removed in enumerate(removable):
        if removed:
            alpha_pixels[index % width, index // width] = 0
    frame.putalpha(alpha)
    return frame


def process_gif(source: Image.Image) -> tuple[Image.Image, int]:
    frames = []
    for index in range(source.n_frames):
        source.seek(index)
        frame = remove_gif_background(source)
        box = frame.getchannel("A").getbbox()
        if box is None:
            raise ValueError(f"GIF 第 {index} 帧为空")
        frames.append((frame, box))

    frame_width = max(box[2] - box[0] for _, box in frames)
    frame_height = max(box[3] - box[1] for _, box in frames)
    result = Image.new(
        "RGBA",
        (frame_width * len(frames), frame_height),
        (0, 0, 0, 0),
    )
    for index, (frame, box) in enumerate(frames):
        cropped = frame.crop(box)
        x = index * frame_width + (frame_width - cropped.width) // 2
        y = frame_height - cropped.height
        result.alpha_composite(cropped, (x, y))
    return result, len(frames)


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, (row, frame_count) in ACTIONS.items():
        output = OUTPUT / name
        process_row(source, row, frame_count).save(output)
        print(f"已生成 {output.relative_to(ROOT)}")

    laugh, frame_count = process_gif(Image.open(LAUGH_SOURCE))
    laugh_path = OUTPUT / "laugh.processed.png"
    laugh.save(laugh_path)
    print(f"已生成 {laugh_path.relative_to(ROOT)}（{frame_count} 帧）")


if __name__ == "__main__":
    main()
