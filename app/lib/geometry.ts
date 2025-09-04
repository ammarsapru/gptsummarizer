import type { DraggableElementData } from "@/types/canvas";

type Pt = { x: number; y: number };
type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  center: Pt;
};

export function getElementBounds(elements: DraggableElementData[], id: string): Bounds | null {
  const el = elements.find((n) => n.id === id);
  if (!el || !el.pos || !el.size) return null;
  const { x, y } = el.pos;
  const { width, height } = el.size;
  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
    center: { x: x + width / 2, y: y + height / 2 },
  };
}

export function getCardEdgePoint(card: Bounds, other: Pt) {
  const { left, top, right, bottom, center } = card;
  const dx = other.x - center.x;
  const dy = other.y - center.y;
  const epsilon = 1e-6;
  const pts: Pt[] = [];

  if (Math.abs(dy) > epsilon) {
    const x_top = center.x + (dx / dy) * (top - center.y);
    if (x_top >= left - epsilon && x_top <= right + epsilon) pts.push({ x: x_top, y: top });
    const x_bottom = center.x + (dx / dy) * (bottom - center.y);
    if (x_bottom >= left - epsilon && x_bottom <= right + epsilon) pts.push({ x: x_bottom, y: bottom });
  }
  if (Math.abs(dx) > epsilon) {
    const y_left = center.y + (dy / dx) * (left - center.x);
    if (y_left >= top - epsilon && y_left <= bottom + epsilon) pts.push({ x: left, y: y_left });
    const y_right = center.y + (dy / dx) * (right - center.x);
    if (y_right >= top - epsilon && y_right <= bottom + epsilon) pts.push({ x: right, y: y_right });
  }

  if (Math.abs(dx) < epsilon) {
    if (dy > 0) pts.push({ x: center.x, y: bottom });
    else if (dy < 0) pts.push({ x: center.x, y: top });
  }
  if (Math.abs(dy) < epsilon) {
    if (dx > 0) pts.push({ x: right, y: center.y });
    else if (dx < 0) pts.push({ x: left, y: center.y });
  }

  if (!pts.length) return null;

  return pts.reduce((best: Pt | null, cur: Pt) => {
    const dCur = Math.hypot(cur.x - other.x, cur.y - other.y);
    const dBest = best ? Math.hypot(best.x - other.x, best.y - other.y) : Infinity;
    return dCur < dBest ? cur : best;
  }, null as Pt | null);
}

export function getArrowEndpoint(
  elements: DraggableElementData[],
  startId: string,
  endId: string
) {
  const a = getElementBounds(elements, startId);
  const b = getElementBounds(elements, endId);
  if (!a || !b) return null;
  return {
    start: getCardEdgePoint(a, b.center)!,
    end: getCardEdgePoint(b, a.center)!,
  };
}
