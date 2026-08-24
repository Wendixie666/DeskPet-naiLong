import type { Bounds, Point, Size } from "../shared/types";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function constrainWindowPosition(
  position: Point,
  windowSize: Size,
  workArea: Bounds,
): Point {
  const maximumX = Math.max(workArea.x, workArea.x + workArea.width - windowSize.width);
  const maximumY = Math.max(workArea.y, workArea.y + workArea.height - windowSize.height);

  return {
    x: clamp(Math.round(position.x), workArea.x, maximumX),
    y: clamp(Math.round(position.y), workArea.y, maximumY),
  };
}

export function cursorToWindowPosition(
  cursor: Point,
  windowSize: Size,
  footAnchor: Point,
  workArea: Bounds,
): Point {
  return constrainWindowPosition(
    {
      x: cursor.x - footAnchor.x,
      y: cursor.y - footAnchor.y,
    },
    windowSize,
    workArea,
  );
}
