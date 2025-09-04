"use client";

import { forwardRef, useCallback } from "react";

const DraggableElement = forwardRef(
  (
    {
      id,
      pos,
      size,
      onDragStart,
      onResizeStart,
      children,
    }: any,
    ref: any
  ) => {
    const handleMouseDown = useCallback(
      (e: MouseEvent | any) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        onDragStart(e, id);
      },
      [id, onDragStart]
    );

    const handleResizeMouseDown = useCallback(
      (e: MouseEvent | any, direction: string) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        onResizeStart(e, id, direction);
      },
      [id, onResizeStart]
    );

    return (
      <div
        ref={ref}
        id={id}
        data-element-id={id}
        className="absolute select-none cursor-grab"
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          width: size.width,
          height: size.height,
          willChange: "transform",
        }}
        onMouseDown={handleMouseDown as any}
      >
        <div className="w-full h-full relative">
          {children}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, "bottom right")}
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-700"
            title="Resize"
          />
        </div>
      </div>
    );
  }
);

export default DraggableElement;
