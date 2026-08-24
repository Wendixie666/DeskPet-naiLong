import type {
  Bounds,
  CharacterVisual,
  VisualAdjustment,
} from "../shared/types";

export interface VisualPlacement {
  scale: number;
  x: number;
  y: number;
}

export function calculateVisualPlacement(
  bounds: Bounds,
  visual: CharacterVisual,
  adjustment: VisualAdjustment = {},
): VisualPlacement {
  const adjustmentScale = adjustment.scale ?? 1;
  const offset = adjustment.offset ?? { x: 0, y: 0 };
  const scale = visual.contentHeight / bounds.height * adjustmentScale;

  return {
    scale,
    x: visual.footAnchor.x - (bounds.x + bounds.width / 2) * scale + offset.x,
    y: visual.footAnchor.y - (bounds.y + bounds.height) * scale + offset.y,
  };
}
