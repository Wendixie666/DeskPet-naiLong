"""将罗小黑 GIF 动作转换为高分辨率、等宽的透明 Sprite Sheet。"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "素材/罗小黑"
OUTPUT = SOURCE / "processed"
UPSCALE = 2

ACTIONS = {
    "main-run.gif": "walk.processed.png",
    "main-wave.gif": "wave.processed.png",
    "main-play-heixiu.gif": "play-heixiu.processed.png",
    "main-wiggle.gif": "wiggle.processed.png",
}


def process_gif(input_path: Path, output_path: Path) -> int:
    source = Image.open(input_path)
    frames = []
    for index in range(source.n_frames):
        source.seek(index)
        frame = source.convert("RGBA")
        resized = frame.resize(
            (frame.width * UPSCALE, frame.height * UPSCALE),
            Image.LANCZOS,
        )
        frames.append(ImageEnhance.Sharpness(resized).enhance(1.15))

    frame_width = frames[0].width
    frame_height = frames[0].height
    result = Image.new(
        "RGBA",
        (frame_width * len(frames), frame_height),
        (0, 0, 0, 0),
    )
    for index, frame in enumerate(frames):
        result.alpha_composite(frame, (index * frame_width, 0))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    result.save(output_path)
    print(
        f"已生成 {output_path.relative_to(ROOT)}："
        f"{len(frames)} 帧，单帧 {frame_width}x{frame_height}"
    )
    return len(frames)


def main() -> None:
    for input_name, output_name in ACTIONS.items():
        process_gif(SOURCE / input_name, OUTPUT / output_name)


if __name__ == "__main__":
    main()
