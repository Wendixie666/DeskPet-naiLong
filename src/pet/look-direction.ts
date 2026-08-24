import type { Bounds, Point } from "../shared/types";

export type LookDirection =
  | "up"
  | "up-near-right"
  | "up-right"
  | "right-near-up"
  | "right"
  | "right-near-down"
  | "down-right"
  | "down-near-right"
  | "down"
  | "down-near-left"
  | "down-left"
  | "left-near-down"
  | "left"
  | "left-near-up"
  | "up-left"
  | "up-near-left";

const directions: LookDirection[] = [
  "right",
  "right-near-down",
  "down-right",
  "down-near-right",
  "down",
  "down-near-left",
  "down-left",
  "left-near-down",
  "left",
  "left-near-up",
  "up-left",
  "up-near-left",
  "up",
  "up-near-right",
  "up-right",
  "right-near-up",
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
  const bucket = Math.round(angle / (Math.PI / 8));
  return directions[(bucket + directions.length) % directions.length];
}
