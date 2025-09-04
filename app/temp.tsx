"use client";

import { useState, useRef, useCallback, useEffect, forwardRef, useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import Card from "./card";
import { supabase } from "@/utils/supabase/client";

interface ChatPair {
  user: string;
  assistant: string;
}
interface DraggableElementData {
  id: string;
  pos?: { x: number; y: number };
  size?: { width: number; height: number };
  user: string;
  assistant: string;
  generating?: boolean;
}

/** Arrow between two points in render coords (no manual pan/scale here). */
const ArrowConnector = ({ start, end, color = "#4b5563" }) => {
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
};

/** Draggable + resizable wrapper (receives render-space pos/size). */
const DraggableElement = forwardRef(
  ({ id, pos, size, onDragStart, onResizeStart, children }: any, ref: any) => {
    const handleMouseDown = useCallback(
      (e: MouseEvent | any) => {
        if (e.button !== 0) return; // left click only for card drag
        e.stopPropagation();
        e.preventDefault();
        onDragStart(e, id);
      },
      [id, onDragStart]
    );

    const handleResizeMouseDown = useCallback(
      (e: MouseEvent | any, direction: string) => {
        if (e.button !== 0) return; // Only allow left mouse button to trigger resize
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
        className={`absolute select-none transition-transform duration-75 ease-out cursor-grab`}
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          width: size.width,
          height: size.height,
        }}
        onMouseDown={handleMouseDown as any}
      >
        <div className="w-full h-full relative">
          {children}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, "bottom right")}
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-700"
          />
        </div>
      </div>
    );
  }
);

/** ---- Helper to compute world bounds ---- */
function computeBounds(
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

export default function Home() {
  const mockCards = useMemo(
    () => [
      {
        user: "How to center a div in CSS?",
        assistant:
          "You can center a div by using Flexbox or Grid. For Flexbox: display: flex; justify-content: center; align-items: center; height: 100vh;. For Grid: display: grid; place-items: center; height: 100vh;. Both approaches work for vertical and horizontal centering.",
      },
      {
        user: "Explain closures in JavaScript",
        assistant:
          "A closure is formed when a function retains access to variables from its lexical scope, even after that scope has exited. For example, an inner function can remember variables from its outer function's scope, which enables powerful patterns like data encapsulation and function factories.",
      },
      {
        user: "What is the difference between == and === in JavaScript?",
        assistant:
          "The == operator checks for equality after type coercion, meaning different types can be converted before comparison. The === operator checks for equality without type coercion, meaning both value and type must match exactly.",
      },
      {
        user: "How do I make an API call in Next.js?",
        assistant:
          "You can use fetch inside getServerSideProps or getStaticProps for server-side calls, or directly in a useEffect for client-side fetching. Example: useEffect(() => { fetch('/api/data').then(res => res.json()).then(data => setData(data)); }, []);",
      },
    ],
    []
  );

  const [chatPairs, setChatPairs] = useState<ChatPair[]>([]);
  const [zoom, setZoom] = useState(1); // currently unused; leave or repoint buttons to setScale
  const [scale, setScale] = useState(1);
  const [connections, setConnections] = useState<{ from: string; to: string }[]>([]);
  //example data ^--: [
//   { from: "card-1", to: "card-2" },
//   { from: "card-2", to: "card-3" }
// ]
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });


  const startMousePosition = useRef<any>({
    x: 0,
    y: 0,
    pos: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    direction: "",
  });
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const [elements, setElements] = useState<DraggableElementData[]>([]);
  //example data ^--: [
//   {
//     id: "card-1",
//     pos: { x: 50, y: 50 },
//     size: { width: 300, height: 200 },
//     user: "How to center a div in CSS?",
//     assistant: "You can center a div by using Flexbox or Grid. For Flexbox: display: flex; justify-content: center; align-items: center; height: 100vh;. For Grid: display: grid; place-items: center; height: 100vh;. Both approaches work for vertical and horizontal centering.",
//     generating: false
//   },
//   {
//     id: "card-2",
//     pos: { x: 400, y: 50 },
//     size: { width: 300, height: 200 },
//     user: "Explain closures in JavaScript",
//     assistant: "A closure is formed when a function retains access to variables from its lexical scope, even after that scope has exited. For example, an inner function can remember variables from its outer function's scope, which enables powerful patterns like data encapsulation and function factories.",
//     generating: false
//   }
//   // ...more cards
// ]
  const [resizingElementId, setResizingElementId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const elementRefs = useRef<Record<string, HTMLElement>>({});

  useEffect(() => {
    const fetchInitialData = async () => {
      console.log("fetching initial data from supabase...");
      const { data, error } = await supabase
        .from('chat-pairs')
        .select('*')

      if (error) {
        console.error("Error fetching chat pairs:", error);
        return;
      }
      const initialPairs = data.map(row => ({
        user: row.user,
        assistant: row.assistant
      }));
      setChatPairs(initialPairs);
      console.log("Initial chat pairs loaded:", initialPairs);
    };
    fetchInitialData();

    const chatChannel = supabase
      .channel('public:chat-pairs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat-pairs' }, payload => {
        console.log("New chat pair received:", payload);
        const newPair = {
          user: (payload.new as any).user,
          assistant: (payload.new as any).assistant
        };
        setChatPairs((prevPairs) => [...prevPairs, newPair]);
        console.log("Updated chat pairs:", newPair);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      console.log("Unsubscribed from chat-pairs channel.");
    };
  }, []);

  useEffect(() => {
    // These lines determine where each card should be placed in a grid by assigning its column (gridX) and row (gridY) based on its index.
    //  This helps space out the cards visually in a 3-column layout.
    if (elements.length === 0) {
      setElements(
        chatPairs.map((card, index) => {
          const gridX = index % 3;
          const gridY = Math.floor(index / 3);
          return {
            ...card,
            id: `card-${index + 1}`,
            pos: { x: 50 + gridX * 350, y: 50 + gridY * 250 },
            size: { width: 300, height: 200 },
          };
        })
      );
    }
  }, [chatPairs, elements.length]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleConnectClick = useCallback(
    (id: string) => {
      if (selectedCardId) {
        if (selectedCardId === id) {
          setSelectedCardId(null);
        } else {
          const exists = connections.some(
            (c) => (c.from === selectedCardId && c.to === id) || (c.from === id && c.to === selectedCardId)
          );
          if (!exists) setConnections((prev) => [...prev, { from: selectedCardId, to: id }]);
          setSelectedCardId(null);
        }
      } else {
        setSelectedCardId(id);
      }
    },
    [selectedCardId, connections]
  );

  const handleWheel = useCallback(
    (e: WheelEvent | any) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomAmount = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.01, scale + zoomAmount);
      const scaleRatio = newScale / scale;

      setPanOffset((prev) => ({
        x: mouseX - scaleRatio * (mouseX - prev.x),
        y: mouseY - scaleRatio * (mouseY - prev.y),
      }));
      setScale(newScale);
    },
    [scale]
  );

  const handleCanvasMouseDown = useCallback(
    (e: MouseEvent | any) => {
      const target = e.target as HTMLElement;
      const onCard = target.closest("[data-element-id]");
      const middleMouse = e.button === 1;
      if (!onCard || middleMouse) {
        e.preventDefault();
        setIsPanning(true);
        startMousePosition.current = { x: e.clientX, y: e.clientY, pos: panOffset };
      }
    },
    [panOffset]
  );

  const handleContainerMouseMove = useCallback(
    (e: MouseEvent | any) => {
      if (!containerRef.current) return;

      if (isPanning) {
        const dx = e.clientX - startMousePosition.current.x;
        const dy = e.clientY - startMousePosition.current.y;
        setPanOffset({
          x: startMousePosition.current.pos.x + dx,
          y: startMousePosition.current.pos.y + dy,
        });
      }

      if (draggingElementId) {
        const dx = (e.clientX - startMousePosition.current.x) / scale;
        const dy = (e.clientY - startMousePosition.current.y) / scale;

        const newPos = {
          x: startMousePosition.current.pos.x + dx,
          y: startMousePosition.current.pos.y + dy,
        };

        setElements((prevElements) =>
          prevElements.map((el) => (el.id === draggingElementId ? { ...el, pos: newPos } : el))
        );
      } else if (resizingElementId) {
        const { x: startX, y: startY } = startMousePosition.current;
        const { width: startWidth, height: startHeight } = startMousePosition.current.size;
        const { direction } = startMousePosition.current;

        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;

        let newWidth = startWidth;
        let newHeight = startHeight;

        if (direction.includes("right")) newWidth = Math.max(100, startWidth + dx);
        if (direction.includes("bottom")) newHeight = Math.max(100, startHeight + dy);

        setElements((prevElements) =>
          prevElements.map((el) =>
            el.id === resizingElementId ? { ...el, size: { width: newWidth, height: newHeight } } : el
          )
        );
      }
    },
    [isPanning, draggingElementId, resizingElementId, scale]
  );

  const handleContainerMouseUp = useCallback(() => {
    if (draggingElementId) setDraggingElementId(null);
    else if (resizingElementId) setResizingElementId(null);
    else if (isPanning) setIsPanning(false);
  }, [draggingElementId, resizingElementId, isPanning]);

  const handleDragStart = useCallback(
    (e: MouseEvent | any, id: string) => {
      if (e.button !== 0) return; // left click only
      const element = elements.find((el) => el.id === id);
      if (!element || !element.pos) return;
      setDraggingElementId(id);
      startMousePosition.current = { x: e.clientX, y: e.clientY, pos: element.pos };
    },
    [elements]
  );

  // --------- Geometry helpers (world space) ---------
  const getCardEdgePoint = useCallback((cardBounds: any, otherPoint: any) => {
    if (!cardBounds || !otherPoint) return null;

    const { left, top, right, bottom, center } = cardBounds;
    const dx = otherPoint.x - center.x;
    const dy = otherPoint.y - center.y; // <-- fixed typo here
    const epsilon = 1e-6;
    const potentialPoints: { x: number; y: number }[] = [];

    if (Math.abs(dy) > epsilon) {
      const x_top = center.x + (dx / dy) * (top - center.y);
      if (x_top >= left - epsilon && x_top <= right + epsilon) potentialPoints.push({ x: x_top, y: top });
    }
    if (Math.abs(dy) > epsilon) {
      const x_bottom = center.x + (dx / dy) * (bottom - center.y);
      if (x_bottom >= left - epsilon && x_bottom <= right + epsilon) potentialPoints.push({ x: x_bottom, y: bottom });
    }
    if (Math.abs(dx) > epsilon) {
      const y_left = center.y + (dy / dx) * (left - center.x);
      if (y_left >= top - epsilon && y_left <= bottom + epsilon) potentialPoints.push({ x: left, y: y_left });
    }
    if (Math.abs(dx) > epsilon) {
      const y_right = center.y + (dy / dx) * (right - center.x);
      if (y_right >= top - epsilon && y_right <= bottom + epsilon) potentialPoints.push({ x: right, y: y_right });
    }

    if (Math.abs(dx) < epsilon) {
      if (dy > 0) potentialPoints.push({ x: center.x, y: bottom });
      else if (dy < 0) potentialPoints.push({ x: center.x, y: top });
    }
    if (Math.abs(dy) < epsilon) {
      if (dx > 0) potentialPoints.push({ x: right, y: center.y });
      else if (dx < 0) potentialPoints.push({ x: left, y: center.y });
    }

    if (!potentialPoints.length) return null;

    const closestPoint = potentialPoints.reduce((closest: any, current) => {
      const dCur = Math.hypot(current.x - otherPoint.x, current.y - otherPoint.y);
      const dClo = closest ? Math.hypot(closest.x - otherPoint.x, closest.y - otherPoint.y) : Infinity;
      return dCur < dClo ? current : closest;
    }, null as any);

    return closestPoint;
  }, []);

  const getElementBounds = useCallback(
    (id: string) => {
      const element = elements.find((el) => el.id === id);
      if (!element || !element.pos || !element.size) return null;

      const pos = { x: element.pos.x, y: element.pos.y };
      const size = { width: element.size.width, height: element.size.height };

      return {
        left: pos.x,
        top: pos.y,
        right: pos.x + size.width,
        bottom: pos.y + size.height,
        width: size.width,
        height: size.height,
        center: { x: pos.x + size.width / 2, y: pos.y + size.height / 2 },
      };
    },
    [elements]
  );

  const getArrowEndpoint = useCallback(
    (startElementId: string, endElementId: string) => {
      const startBounds = getElementBounds(startElementId);
      const endBounds = getElementBounds(endElementId);
      if (!startBounds || !endBounds) return null;
      const startPoint = getCardEdgePoint(startBounds, endBounds.center);
      const endPoint = getCardEdgePoint(endBounds, startBounds.center);
      return { start: startPoint, end: endPoint };
    },
    [getElementBounds, getCardEdgePoint]
  );

  /** --------- Freeze layout bounds while interacting --------- */
  const PADDING = 400;
  const isInteracting = !!(draggingElementId || resizingElementId || isPanning);

  const [layoutBounds, setLayoutBounds] = useState(() =>
    computeBounds(elements, containerDimensions.width, containerDimensions.height)
  );

  useEffect(() => {
    if (isInteracting) return; // freeze during drag/resize/pan
    setLayoutBounds(computeBounds(elements, containerDimensions.width, containerDimensions.height));
  }, [elements, containerDimensions.width, containerDimensions.height, isInteracting]);

  const renderOffset = useMemo(
    () => ({
      x: PADDING - layoutBounds.minX,
      y: PADDING - layoutBounds.minY,
    }),
    [layoutBounds.minX, layoutBounds.minY]
  );

  const { canvasWidth, canvasHeight } = useMemo(() => {
    const spanW = Math.max(
      containerDimensions.width,
      layoutBounds.maxRight - layoutBounds.minX + PADDING * 2
    );
    const spanH = Math.max(
      containerDimensions.height,
      layoutBounds.maxBottom - layoutBounds.minY + PADDING * 2
    );
    return { canvasWidth: spanW, canvasHeight: spanH };
  }, [
    containerDimensions.width,
    containerDimensions.height,
    layoutBounds.maxRight,
    layoutBounds.minX,
    layoutBounds.maxBottom,
    layoutBounds.minY,
  ]);

  // --------------------------------------------------

  return (
    <div className="flex min-h-screen w-full h-full">
      {/* Sidebar (can be ignored) */}
      <div className="flex flex-col items-center justify-center w-1/12 h-full bg-black p-2">
        <div className="bg-white rounded-lg shadow-lg p-4 w-full flex flex-col items-center">
          <h1 className="text-sm mb-2 text-center">Sidebar</h1>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="p-1 bg-gray-200 rounded hover:bg-gray-300"
              title="Zoom Out"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              className="p-1 bg-gray-200 rounded hover:bg-gray-300"
              title="Zoom In"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Card Area */}
      <div
        className="flex-1 flex-col items-center w-11/12 bg-white overflow-y-auto p-4 relative overflow-hidden touch-none"
        ref={containerRef}
        onMouseMove={handleContainerMouseMove as any}
        onMouseUp={handleContainerMouseUp as any}
        onMouseDown={handleCanvasMouseDown as any}
        onWheel={handleWheel as any}
        onMouseLeave={() => isPanning && setIsPanning(false)}
      >
        <div
          className="relative"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <svg
            className="absolute top-0 left-0 pointer-events-none z-20"
            width={canvasWidth}
            height={canvasHeight}
            style={{ overflow: "visible" }}
          >
            <defs>
              <marker
                id="arrowhead"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="10"
                markerHeight="10"
                markerUnits="userSpaceOnUse"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#4b5563" />
              </marker>
            </defs>
            {connections.map((conn, index) => {
              const endpoints = getArrowEndpoint(conn.from, conn.to);
              if (!endpoints) return null;
              const start = {
                x: endpoints.start.x + renderOffset.x,
                y: endpoints.start.y + renderOffset.y,
              };
              const end = {
                x: endpoints.end.x + renderOffset.x,
                y: endpoints.end.y + renderOffset.y,
              };
              return <ArrowConnector key={index} start={start} end={end} />;
            })}
          </svg>

          {elements.map(
            (el) =>
              el.pos &&
              el.size && (
                <DraggableElement
                  key={el.id}
                  id={el.id}
                  pos={{
                    x: el.pos.x + renderOffset.x,
                    y: el.pos.y + renderOffset.y,
                  }}
                  size={el.size}
                  onDragStart={handleDragStart}
                  onResizeStart={(e: any, id: string, direction: string) => {
                    const element = elements.find((el) => el.id === id);
                    if (!element || !element.size) return;
                    setResizingElementId(id);
                    startMousePosition.current = {
                      x: e.clientX,
                      y: e.clientY,
                      size: element.size,
                      direction,
                    };
                  }}
                  ref={(instance: any) => {
                    if (instance) elementRefs.current[el.id] = instance;
                    else delete elementRefs.current[el.id];
                  }}
                >
                  <Card
                    id={el.id}
                    user={el.user}
                    assistant={el.assistant}
                    onConnect={handleConnectClick}
                    isSelected={selectedCardId === el.id}
                  />
                </DraggableElement>
              )
          )}
        </div>
      </div>
    </div>
  );
}
