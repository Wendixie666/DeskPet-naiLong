#!/usr/bin/env python3
"""验证素材预处理的输入、输出和帧数契约。"""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image


SCRIPT_PATH = Path(__file__).with_name("preprocess_sprite.py")
SPEC = importlib.util.spec_from_file_location("preprocess_sprite", SCRIPT_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"无法加载 {SCRIPT_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PreprocessSpriteTest(unittest.TestCase):
    def create_source(self, path: Path) -> None:
        image = Image.new("RGB", (8, 4), (30, 80, 220))
        pixels = image.load()
        for x in (1, 2):
            for y in (1, 2):
                pixels[x, y] = (220, 80, 80)
        for x in (4, 5, 6):
            for y in (0, 1, 2):
                pixels[x, y] = (80, 220, 80)
        image.save(path)

    def test_preprocess_writes_transparent_sprite_and_debug_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            output = root / "processed.png"
            debug = root / "processed.debug.png"
            self.create_source(source)

            MODULE.preprocess(source, output, 2, debug)

            result = Image.open(output).convert("RGBA")
            self.assertEqual(result.size, (6, 3))
            self.assertEqual(result.getpixel((0, 0))[3], 0)
            self.assertEqual(result.getpixel((1, 2))[:3], (220, 80, 80))
            with Image.open(debug) as debug_image:
                self.assertEqual(debug_image.mode, "RGB")

    def test_preprocess_rejects_unexpected_frame_count(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            self.create_source(source)

            with self.assertRaisesRegex(ValueError, "detected_frames=2"):
                MODULE.preprocess(source, root / "processed.png", 1, root / "debug.png")

    def test_grid_splits_continuous_frames_into_equal_cells(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            output = root / "processed.png"
            debug = root / "processed.debug.png"
            image = Image.new("RGBA", (8, 4), (0, 0, 0, 0))
            for x in range(8):
                for y in range(1, 3):
                    image.putpixel((x, y), (220 if x < 4 else 80, 80, 80, 255))
            image.save(source)

            MODULE.preprocess(source, output, 2, debug, grid=True)

            with Image.open(output) as result:
                self.assertEqual(result.size, (8, 2))
                self.assertEqual(result.getpixel((1, 0))[:3], (220, 80, 80))
                self.assertEqual(result.getpixel((5, 0))[:3], (80, 80, 80))

    def test_grid_rejects_non_equal_cell_width(self) -> None:
        with self.assertRaisesRegex(ValueError, "无法被帧数.*等分"):
            MODULE.grid_frame_ranges(7, 2)


if __name__ == "__main__":
    unittest.main()
