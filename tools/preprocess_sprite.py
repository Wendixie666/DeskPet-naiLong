#!/usr/bin/env python3
"""将蓝底逐帧素材预处理为透明、等宽的 Sprite Sheet。

输入应是横向排列、帧之间有蓝幕间隔的素材；输出是 renderer 使用的透明
Sprite Sheet，同时生成只用于人工检查的 debug 预览图。
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


def is_blue_screen(red: int, green: int, blue: int) -> bool:
    return blue > 120 and blue > red * 1.35 and blue > green * 1.35


# 透明底素材帧间隙常残留 alpha 很低的杂散像素，低于该阈值的像素视为背景。
ALPHA_THRESHOLD = 8


def foreground_mask(image: Image.Image) -> list[list[bool]]:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    return [
        [
            pixels[x, y][3] >= ALPHA_THRESHOLD
            and not is_blue_screen(pixels[x, y][0], pixels[x, y][1], pixels[x, y][2])
            for x in range(rgba.width)
        ]
        for y in range(rgba.height)
    ]


def find_frame_ranges(mask: list[list[bool]], width: int) -> list[tuple[int, int]]:
    occupied = [any(row[x] for row in mask) for x in range(width)]
    ranges: list[tuple[int, int]] = []
    start: int | None = None
    for x, has_foreground in enumerate(occupied + [False]):
        if has_foreground and start is None:
            start = x
        elif not has_foreground and start is not None:
            ranges.append((start, x))
            start = None
    return ranges


def find_bbox(mask: list[list[bool]], left: int, right: int, height: int) -> tuple[int, int, int, int]:
    points = [
        (x, y)
        for y in range(height)
        for x in range(left, right)
        if mask[y][x]
    ]
    if not points:
        raise ValueError(f"检测到空帧，范围为 x={left}:{right}")
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def grid_frame_ranges(width: int, frame_count: int) -> list[tuple[int, int]]:
    cell = width / frame_count
    return [(round(i * cell), round((i + 1) * cell)) for i in range(frame_count)]


def preprocess(
    input_path: Path,
    output_path: Path,
    expected_frame_count: int,
    debug_path: Path,
    grid: bool = False,
) -> None:
    image = Image.open(input_path).convert("RGBA")
    mask = foreground_mask(image)
    alpha = Image.new("L", image.size)
    alpha.putdata([255 if value else 0 for row in mask for value in row])
    image.putalpha(alpha)
    if grid:
        # 帧内容横向相连（如尾巴相接）时无法按间隙切分，改为均匀网格切帧。
        ranges = grid_frame_ranges(image.width, expected_frame_count)
    else:
        ranges = find_frame_ranges(mask, image.width)
        if len(ranges) != expected_frame_count:
            raise ValueError(
                f"{input_path}: detected_frames={len(ranges)}, "
                f"expected_frame_count={expected_frame_count}"
            )

    boxes = [find_bbox(mask, left, right, image.height) for left, right in ranges]
    canvas_width = max(right - left for left, top, right, bottom in boxes)
    canvas_height = max(bottom - top for left, top, right, bottom in boxes)
    result = Image.new("RGBA", (canvas_width * expected_frame_count, canvas_height), (0, 0, 0, 0))

    for index, (left, top, right, bottom) in enumerate(boxes):
        crop = image.crop((left, top, right, bottom))
        x = index * canvas_width + (canvas_width - crop.width) // 2
        y = canvas_height - crop.height
        result.alpha_composite(crop, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    result.save(output_path)

    debug = Image.new("RGBA", result.size, (48, 48, 48, 255))
    debug.alpha_composite(result)
    draw = ImageDraw.Draw(debug)
    for index in range(expected_frame_count):
        left = index * canvas_width
        center = left + canvas_width // 2
        bottom = canvas_height - 1
        draw.rectangle((left, 0, left + canvas_width - 1, bottom), outline=(255, 190, 0, 255))
        draw.line((center, 0, center, bottom), fill=(255, 80, 80, 255), width=1)
        draw.line((left, bottom, left + canvas_width - 1, bottom), fill=(80, 255, 120, 255), width=1)
    debug_path.parent.mkdir(parents=True, exist_ok=True)
    debug.convert("RGB").save(debug_path)

    print(
        f"已处理 {input_path}：{len(boxes)} 帧，真实区域画布 {canvas_width}x{canvas_height}，"
        f"输出 {output_path}，预览 {debug_path}"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="原始蓝底素材")
    parser.add_argument("--expected-frame-count", type=int, required=True, help="期望帧数")
    parser.add_argument("--grid", action="store_true", help="按均匀网格切帧（帧内容横向相连时使用）")
    parser.add_argument("--output", type=Path, required=True, help="透明 Sprite Sheet 输出路径")
    parser.add_argument("--debug", type=Path, help="debug 预览路径，默认与 output 同名")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    debug_path = args.debug or args.output.with_name(f"{args.output.stem}.debug.png")
    preprocess(args.input, args.output, args.expected_frame_count, debug_path, args.grid)


if __name__ == "__main__":
    main()
