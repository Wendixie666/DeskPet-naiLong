import type { CharacterConfig, Bounds, Point, Size } from "../shared/types";

interface PetWindowGeometry {
  getBounds(): Bounds;
  setBounds(bounds: Bounds): void;
  workAreaAt(point: Point): Bounds;
}

export function scaledSize(config: CharacterConfig, scale: number): Size {
  return {
    width: Math.round(config.size.width * scale),
    height: Math.round(config.size.height * scale),
  };
}

function scaledFootAnchor(config: CharacterConfig, scale: number): Point {
  return {
    x: config.visual.footAnchor.x * scale,
    y: config.visual.footAnchor.y * scale,
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

export function resizePetWindow(
  window: PetWindowGeometry,
  currentCharacter: CharacterConfig,
  currentScale: number,
  nextCharacter: CharacterConfig,
  nextScale: number,
): Point {
  const previousBounds = window.getBounds();
  const previousAnchor = scaledFootAnchor(currentCharacter, currentScale);
  const footPosition = {
    x: previousBounds.x + previousAnchor.x,
    y: previousBounds.y + previousAnchor.y,
  };
  const size = scaledSize(nextCharacter, nextScale);
  const display = window.workAreaAt(footPosition);
  const nextAnchor = scaledFootAnchor(nextCharacter, nextScale);
  const position = constrainPosition({
    x: footPosition.x - nextAnchor.x,
    y: footPosition.y - nextAnchor.y,
  }, size, display);

  window.setBounds({ ...position, ...size });
  return position;
}
