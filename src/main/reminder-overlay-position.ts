import type { Bounds, Point, Size } from "../shared/types";

export function reminderOverlayPosition(
  petBounds: Bounds,
  workArea: Bounds,
  overlaySize: Size,
  gap = 10,
): Point {
  const rightX = petBounds.x + petBounds.width + gap;
  const leftX = petBounds.x - overlaySize.width - gap;
  const rightEdge = workArea.x + workArea.width;
  const x = rightX + overlaySize.width <= rightEdge ? rightX : leftX;
  const y = petBounds.y - overlaySize.height + 8;
  return {
    x: Math.round(Math.max(workArea.x, Math.min(x, rightEdge - overlaySize.width))),
    y: Math.round(Math.max(
      workArea.y,
      Math.min(y, workArea.y + workArea.height - overlaySize.height),
    )),
  };
}
