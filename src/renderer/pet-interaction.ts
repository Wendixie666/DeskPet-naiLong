import type { CharacterVisual, Point } from "../shared/types";

export function isActivePointer(
  gesture: { pointerId: number } | undefined,
  pointerId: number,
): boolean {
  return gesture?.pointerId === pointerId;
}

export function isInHeadInteraction(
  point: Point,
  visual: CharacterVisual,
): boolean {
  const region = visual.headInteraction;
  if (!region) {
    return false;
  }
  return point.x >= region.x
    && point.x <= region.x + region.width
    && point.y >= region.y
    && point.y <= region.y + region.height;
}
