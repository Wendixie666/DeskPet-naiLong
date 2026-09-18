import type { Bounds, Point, Size, SystemWindow } from "../shared/types";

export const WINDOW_PERCH_SNAP_DISTANCE = 32;

export function findWindowPerchTarget(
  petBounds: Bounds,
  footAnchor: Point,
  windows: SystemWindow[],
): SystemWindow | undefined {
  const reference = {
    x: petBounds.x + footAnchor.x,
    y: petBounds.y + footAnchor.y,
  };
  return windows
    .filter((candidate) => candidate.isOrdinary && !candidate.isMinimized)
    .filter((candidate) => reference.x >= candidate.bounds.x)
    .filter((candidate) => reference.x <= candidate.bounds.x + candidate.bounds.width)
    .map((candidate) => ({
      candidate,
      distance: Math.abs(reference.y - candidate.bounds.y),
    }))
    .filter(({ distance }) => distance <= WINDOW_PERCH_SNAP_DISTANCE)
    .sort((left, right) => left.distance - right.distance)
    .at(0)?.candidate;
}

export function windowPerchPosition(
  targetBounds: Bounds,
  petSize: Size,
  scale: number,
  perchAnchorY: number,
): Point {
  return {
    x: Math.round(targetBounds.x + (targetBounds.width - petSize.width) / 2),
    y: Math.round(targetBounds.y - perchAnchorY * scale),
  };
}

export function sameWindowBounds(left: Bounds, right: Bounds): boolean {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height;
}
