import type { Bounds, Point } from "../shared/types";

export type LookDirection =
  | "up"
  | "up-right"
  | "right"
  | "down-right"
  | "down"
  | "down-left"
  | "left"
  | "up-left";

const directions: LookDirection[] = [
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left",
  "up",
  "up-right",
];

export function resolveLookDirection(
  cursor: Point,
  bounds: Bounds,
): LookDirection {
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  const angle = Math.atan2(cursor.y - center.y, cursor.x - center.x);
  const bucket = Math.round(angle / (Math.PI / 4));
  return directions[(bucket + directions.length) % directions.length];
}
