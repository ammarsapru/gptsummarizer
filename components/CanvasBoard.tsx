"use client";

/* =========================================================
   Imports
   ========================================================= */
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  forwardRef,
} from "react";
import { Minus, Plus } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import ArrowConnector from "./canvas/ArrowConnector";
import DraggableElement from "./canvas/DraggableElement";
import { computeBounds } from "../app/lib/layout";
import { getArrowEndpoint } from "../app/lib/geometry";
import type { ChatPair, DraggableElementData } from "../app/types/canvas";
// If your Card lives in app/card.tsx:
import Card from "../app/card"; // or move Card to components and import from "./Card"

// import Card from "@/app/card";
// import ArrowConnector from "@/components/canvas/ArrowConnector";
// import DraggableElement from "@/components/canvas/DraggableElement";
// import { computeBounds } from "@/lib/layout";
// import { getArrowEndpoint } from "@/lib/geometry";
// import type { ChatPair, DraggableElementData } from "@/types/canvas";

/* =========================================================
   Component: CanvasBoard
   ========================================================= */
export default function CanvasBoard() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Mock data (optional)
  const mockChatPairs: ChatPair[] = [
    {
      user: "What is the capital of France?",
      assistant:
        "The capital of France is Paris, a city celebrated for its remarkable blend of history, art, culture, and innovation. " +
        "Often referred to as the 'City of Light,' Paris has served as a hub for intellectual and artistic movements for centuries. " +
        "Its skyline is punctuated by iconic landmarks such as the Eiffel Tower, the Notre-Dame Cathedral, and the Sacré-Cœur Basilica, " +
        "each of which tells a story of architectural brilliance and historical significance. The city's streets are lined with cafés, " +
        "boutiques, and boulangeries, offering everything from fresh croissants to haute couture fashion. " +
        "At the heart of Paris lies the Louvre Museum, home to world-famous masterpieces like the Mona Lisa and the Venus de Milo, " +
        "alongside countless other treasures spanning thousands of years of human creativity. " +
        "The Seine River winds gracefully through the city, its banks adorned with charming bookstalls and crossed by elegant bridges like Pont Alexandre III and Pont Neuf. " +
        "Paris is not only about its monuments—it is a living, breathing cultural stage where music, theater, and fashion constantly redefine trends. " +
        "Annual events like Paris Fashion Week draw designers, celebrities, and journalists from around the globe, while the city's Michelin-starred restaurants showcase the pinnacle of culinary craftsmanship. " +
        "Beyond the glamour, Paris retains an intimate charm in its quiet neighborhoods, hidden courtyards, and centuries-old markets. " +
        "It is a city that invites both grandeur and simplicity, offering moments of breathtaking beauty whether you are standing atop the Arc de Triomphe " +
        "or simply sipping coffee at a small café terrace, watching the world go by. " +
        "For millions who visit or call it home, Paris represents not just a destination, but a timeless symbol of romance, artistry, and the enduring human spirit.",
    },
    {
      user: "Explain quantum entanglement in simple terms.",
      assistant:
        "Quantum entanglement is a phenomenon where two particles become linked in such a way " +
        "that the state of one instantly affects the state of the other, even if they are light-years apart. " +
        "This is not just a weird coincidence — it’s a fundamental property of quantum mechanics. " +
        "Scientists describe it as the particles sharing a single combined state, " +
        "meaning their properties are correlated in a way that defies classical explanations.",
    },
    {
      user: "Give me tips for improving public speaking.",
      assistant:
        "Improving public speaking takes a combination of preparation, practice, and mindset shifts. " +
        "Start by understanding your audience and tailoring your message to their needs. " +
        "Rehearse multiple times, both alone and in front of a friend, to build confidence. " +
        "Focus on pacing, tone, and clarity — avoid speaking too quickly. " +
        "Use pauses strategically to emphasize points. " +
        "Maintain eye contact, engage with your audience through questions or relatable examples, " +
        "and manage nervous energy with breathing exercises. " +
        "Finally, record yourself to spot areas for improvement and track your progress over time.",
    },
  ];

  const useMock = true;

  /* ---------- State ---------- */
  const [chatPairs, setChatPairs] = useState<ChatPair[]>([]);
  const [elements, setElements] = useState<DraggableElementData[]>([]);
  const [connections, setConnections] = useState<{ from: string; to: string }[]>(
    []
  );

  // Canvas "camera"
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Interaction
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const [resizingElementId, setResizingElementId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const elementRefs = useRef<Record<string, HTMLElement>>({});
  const startMousePosition = useRef<any>({
    x: 0,
    y: 0,
    pos: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    direction: "",
  });

  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  /* =========================================================
     Data: Supabase
     ========================================================= */
  useEffect(() => {
    if (useMock) {
      setChatPairs(mockChatPairs);
      return;
    }

    const fetchInitialData = async () => {
      const { data, error } = await supabase.from("chat-pairs").select("*");
      if (error) {
        console.error("Error fetching chat pairs:", error);
        return;
      }
      const initialPairs = (data || []).map((row: any) => ({
        user: row.user,
        assistant: row.assistant,
      }));
      setChatPairs(initialPairs);
    };
    fetchInitialData();

    const chatChannel = supabase
      .channel("public:chat-pairs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat-pairs" },
        (payload) => {
          const newPair = {
            user: (payload.new as any).user,
            assistant: (payload.new as any).assistant,
          };
          setChatPairs((prev) => [...prev, newPair]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [useMock]);

  /* =========================================================
     Build initial cards from chatPairs
     ========================================================= */
  useEffect(() => {
    if (elements.length === 0 && chatPairs.length > 0) {
      setElements(
        chatPairs.map((card, index) => {
          const gridX = index % 3;
          const gridY = Math.floor(index / 3);
          return {
            ...card,
            id: `card-${index + 1}`,
            pos: { x: 50 + gridX * 350, y: 50 + gridY * 250 }, // WORLD coords
            size: { width: 300, height: 200 },
          };
        })
      );
    }
  }, [chatPairs, elements.length]);

  /* =========================================================
     Container size
     ========================================================= */
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setContainerDimensions({ width: rect.width, height: rect.height });
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* =========================================================
     BLOCK browser page zoom globally
     ========================================================= */
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const isZoomKey =
        e.code === "Equal" ||
        e.code === "NumpadAdd" ||
        e.code === "Minus" ||
        e.code === "NumpadSubtract" ||
        e.code === "Digit0";
      if ((e.ctrlKey || e.metaKey) && isZoomKey) e.preventDefault();
    };
    const prevent = (ev: Event) => ev.preventDefault();

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown as any, { passive: false });
    window.addEventListener("gesturestart", prevent as any, { passive: false });
    window.addEventListener("gesturechange", prevent as any, { passive: false });
    window.addEventListener("gestureend", prevent as any, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel as any);
      window.removeEventListener("keydown", onKeyDown as any);
      window.removeEventListener("gesturestart", prevent as any);
      window.removeEventListener("gesturechange", prevent as any);
      window.removeEventListener("gestureend", prevent as any);
    };
  }, []);

  /* =========================================================
     WORLD layout bounds & render offset (WORLD → RENDER)
     ========================================================= */
  const PADDING = 400;
  const [layoutBounds, setLayoutBounds] = useState(() =>
    computeBounds(elements, containerDimensions.width, containerDimensions.height)
  );
  const isInteracting = !!(draggingElementId || resizingElementId || isPanning);

  useEffect(() => {
    if (isInteracting) return; // freeze while dragging/panning/resizing
    setLayoutBounds(
      computeBounds(elements, containerDimensions.width, containerDimensions.height)
    );
  }, [
    elements,
    containerDimensions.width,
    containerDimensions.height,
    isInteracting,
  ]);

  // Shift world so minX/minY start near padding (keeps RENDER coords positive)
  const renderOffset = useMemo(
    () => ({
      x: PADDING - layoutBounds.minX,
      y: PADDING - layoutBounds.minY,
    }),
    [layoutBounds.minX, layoutBounds.minY]
  );

  // Canvas size (RENDER space)
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

  /* =========================================================
     Screen → World conversion + world viewport (for culling)
     ========================================================= */
  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const inv = 1 / scale;
      const renderX = (sx - panOffset.x) * inv;
      const renderY = (sy - panOffset.y) * inv;
      return { x: renderX - renderOffset.x, y: renderY - renderOffset.y };
    },
    [scale, panOffset.x, panOffset.y, renderOffset.x, renderOffset.y]
  );

  const worldViewport = useMemo(() => {
    const tl = screenToWorld(0, 0);
    const br = screenToWorld(containerDimensions.width, containerDimensions.height);
    const BUFFER = 200;
    return {
      left: Math.min(tl.x, br.x) - BUFFER,
      top: Math.min(tl.y, br.y) - BUFFER,
      right: Math.max(tl.x, br.x) + BUFFER,
      bottom: Math.max(tl.y, br.y) + BUFFER,
    };
  }, [screenToWorld, containerDimensions.width, containerDimensions.height]);

  /* =========================================================
     Interaction: connect / zoom / pan / drag / resize
     ========================================================= */
  const handleConnectClick = useCallback(
    (id: string) => {
      if (selectedCardId) {
        if (selectedCardId === id) {
          setSelectedCardId(null);
        } else {
          const exists = connections.some(
            (c) =>
              (c.from === selectedCardId && c.to === id) ||
              (c.from === id && c.to === selectedCardId)
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

  const zoomAtPoint = useCallback(
    (newScale: number, screenX: number, screenY: number) => {
      const clamped = Math.max(0.1, Math.min(3, newScale));
      const prev = scale;
      if (clamped === prev) return;

      const worldX = (screenX - panOffset.x) / prev;
      const worldY = (screenY - panOffset.y) / prev;

      const newPanX = screenX - worldX * clamped;
      const newPanY = screenY - worldY * clamped;

      setPanOffset({ x: newPanX, y: newPanY });
      setScale(clamped);
    },
    [scale, panOffset.x, panOffset.y]
  );

  const zoomAtCenter = useCallback(
    (delta: number) => {
      const cx = containerDimensions.width / 2;
      const cy = containerDimensions.height / 2;
      zoomAtPoint(scale + delta, cx, cy);
    },
    [zoomAtPoint, containerDimensions.width, containerDimensions.height, scale]
  );

  const handleWheel = useCallback(
    (e: WheelEvent | any) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomAtPoint(scale + zoomDelta, mouseX, mouseY);
        return;
      }

      setPanOffset((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    },
    [scale, zoomAtPoint]
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

        setElements((prev) => {
          const idx = prev.findIndex((el) => el.id === draggingElementId);
          if (idx === -1) return prev;
          const el = prev[idx];
          if (el.pos?.x === newPos.x && el.pos?.y === newPos.y) return prev;
          const next = prev.slice();
          next[idx] = { ...el, pos: newPos };
          return next;
        });
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
            el.id === resizingElementId
              ? { ...el, size: { width: newWidth, height: newHeight } }
              : el
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
      if (e.button !== 0) return;
      const element = elements.find((el) => el.id === id);
      if (!element || !element.pos) return;
      setDraggingElementId(id);
      startMousePosition.current = { x: e.clientX, y: e.clientY, pos: element.pos };
    },
    [elements]
  );

  const centerOnWorldPoint = useCallback(
    (wx: number, wy: number) => {
      setPanOffset({
        x: containerDimensions.width / 2 - scale * (wx + renderOffset.x),
        y: containerDimensions.height / 2 - scale * (wy + renderOffset.y),
      });
    },
    [containerDimensions.width, containerDimensions.height, scale, renderOffset.x, renderOffset.y]
  );

  const screenCenterToNearestCard = useCallback(() => {
    if (!elements.length) return;

    const vpCenter = screenToWorld(
      containerDimensions.width / 2,
      containerDimensions.height / 2
    );

    let best = { id: "", d2: Number.POSITIVE_INFINITY, cx: 0, cy: 0 };
    for (const el of elements) {
      if (!el.pos || !el.size) continue;
      const cx = el.pos.x + el.size.width / 2;
      const cy = el.pos.y + el.size.height / 2;
      const dx = cx - vpCenter.x;
      const dy = cy - vpCenter.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best.d2) best = { id: el.id, d2, cx, cy };
    }
    if (best.id) centerOnWorldPoint(best.cx, best.cy);
  }, [elements, screenToWorld, containerDimensions.width, containerDimensions.height, centerOnWorldPoint]);

  const loadSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    const { data, error } = await supabase
      .from("chat_pairs")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading chat_pairs:", error);
      return;
    }

    const rows = data || [];
    const nextElements = rows.map((row: any, index: number) => {
      const gridX = index % 3;
      const gridY = Math.floor(index / 3);
      return {
        id: `card-${row.id}`,
        pos: { x: 50 + gridX * 350, y: 50 + gridY * 250 },
        size: { width: 300, height: 200 },
        user: row.user,
        assistant: row.assistant,
      };
    });

    setElements(nextElements);

    if (nextElements.length) {
      const first = nextElements[0];
      const cx = first.pos.x + first.size.width / 2;
      const cy = first.pos.y + first.size.height / 2;
      centerOnWorldPoint(cx, cy);
    }
  }, [centerOnWorldPoint]);

  /* =========================================================
     Render
     ========================================================= */
  return (
    <div className="flex min-h-screen w-full h-full">
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="flex flex-col items-center justify-center w-1/12 h-full bg-black p-2 z-30"
        style={{ touchAction: "pan-y" }}
      >
        <div className="bg-white rounded-lg shadow-lg p-4 w-full flex flex-col items-center gap-2">
          <h1 className="text-sm text-center">Sidebar</h1>
          <button
            onClick={() => {
              const cx = containerDimensions.width / 2;
              const cy = containerDimensions.height / 2;
              zoomAtPoint(scale - 0.1, cx, cy);
            }}
            className="p-1 bg-gray-200 rounded hover:bg-gray-300 w-full"
            title="Zoom Out (canvas)"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => {
              const cx = containerDimensions.width / 2;
              const cy = containerDimensions.height / 2;
              zoomAtPoint(scale + 0.1, cx, cy);
            }}
            className="p-1 bg-gray-200 rounded hover:bg-gray-300 w-full"
            title="Zoom In (canvas)"
          >
            <Plus size={14} />
          </button>

          <button
            onClick={screenCenterToNearestCard}
            className="p-1 bg-gray-200 rounded hover:bg-gray-300 w-full mt-1"
            title="Re-center to nearest card"
          >
            Center
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 bg-white p-4 relative overflow-hidden z-0"
        style={{ touchAction: "none" }}
        onWheel={handleWheel as any}
        onMouseDown={handleCanvasMouseDown as any}
        onMouseMove={handleContainerMouseMove as any}
        onMouseUp={handleContainerMouseUp as any}
        onMouseLeave={() => isPanning && setIsPanning(false)}
      >
        {/* Scaled & translated canvas */}
        <div
          className="relative"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
            transformOrigin: "top left",
            isolation: "isolate",
          }}
        >
          {/* Connections */}
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
              const endpoints = getArrowEndpoint(elements, conn.from, conn.to);
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

          {/* Nodes */}
          {elements.map((el) => {
            if (!el.pos || !el.size) return null;

            const elRight = el.pos.x + el.size.width;
            const elBottom = el.pos.y + el.size.height;
            const visible =
              el.pos.x < worldViewport.right &&
              el.pos.y < worldViewport.bottom &&
              elRight > worldViewport.left &&
              elBottom > worldViewport.top;
            if (!visible) return null;

            return (
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
                  const element = elements.find((n) => n.id === id);
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
                  onConnect={(id) => handleConnectClick(id)}
                  isSelected={selectedCardId === el.id}
                />
              </DraggableElement>
            );
          })}
        </div>
      </div>
    </div>
  );
}
