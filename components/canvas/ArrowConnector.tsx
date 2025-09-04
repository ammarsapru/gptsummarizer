"use client";

export default function ArrowConnector({
  start,
  end,
  color = "#4b5563",
}: {
  start: { x: number; y: number };
  end: { x: number; y: number };
  color?: string;
}) {
  if (!start || !end) return null;
  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke={color}
      strokeWidth="2"
      vectorEffect="non-scaling-stroke"
      markerEnd="url(#arrowhead)"
    />
  );
}
