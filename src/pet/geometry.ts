import type {
  Bounds,
  CharacterConfig,
  Facing,
  Point,
  Size,
} from "../shared/types";

export function scaledFootAnchor(
  character: Pick<CharacterConfig, "visual">,
  scale: number,
): Point {
  return {
    x: character.visual.footAnchor.x * scale,
    y: character.visual.footAnchor.y * scale,
  };
}

export function scaledDragAnchor(
  character: Pick<CharacterConfig, "visual">,
  scale: number,
  facing: Facing = "right",
): Point | undefined {
  const anchor = character.visual.dragAnchor;
  if (!anchor) {
    return undefined;
  }
  return {
    x: (facing === "left"
      ? character.visual.footAnchor.x * 2 - anchor.x
      : anchor.x) * scale,
    y: anchor.y * scale,
  };
}

export function constrainPosition(
  position: Point,
  size: Size,
  workArea: Bounds,
): Point {
  const maximumX = Math.max(workArea.x, workArea.x + workArea.width - size.width);
  const maximumY = Math.max(workArea.y, workArea.y + workArea.height - size.height);
  return {
    x: Math.min(Math.max(Math.round(position.x), workArea.x), maximumX),
    y: Math.min(Math.max(Math.round(position.y), workArea.y), maximumY),
  };
}
