import type { DraggableElementData } from "@/types/canvas";

export function computeBounds(
  elements: DraggableElementData[],
  containerW: number,
  containerH: number
) {
  let minX = Infinity,
    minY = Infinity,
    maxRight = -Infinity,
    maxBottom = -Infinity;

  for (const el of elements) {
    if (!el?.pos || !el?.size) continue;
    minX = Math.min(minX, el.pos.x);
    minY = Math.min(minY, el.pos.y);
    maxRight = Math.max(maxRight, el.pos.x + el.size.width);
    maxBottom = Math.max(maxBottom, el.pos.y + el.size.height);
  }

  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxRight = containerW;
    maxBottom = containerH;
  }
  return { minX, minY, maxRight, maxBottom };
}
