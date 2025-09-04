"use client";

import { useState, useRef, useCallback, useEffect, forwardRef, useMemo } from "react";
import { Link, Trash2, Minus, Plus, MessageSquarePlus, Zap, MonitorX } from "lucide-react";

interface DraggableElementData { // Defines the shape of the data for a draggable element, specifying its properties and their types.
    id: string;
    pos?: { x: number; y: number };
    size?: { width: number; height: number };
    title: string;
    content: string;
    generating?: boolean;
}

/**
 * A component to draw a single SVG line between two points.
 * @param {object} props
 * @param {object} props.start - { x, y } coordinates of the start point.
 * @param {object} props.end - { x, y } coordinates of the end point.
 * @param {string} props.color - The stroke color of the line.
 */
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
            markerEnd="url(#arrowhead)"
        />
    );
};

/**
 * A simple loading spinner component.
 */
const LoadingSpinner = () => (
    <svg
        className="animate-spin h-4 w-4 text-blue-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
    >
        <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
        ></circle>
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
    </svg>
);
/**
 * The core Card component with your original styling and text truncation logic.
 * @param {object} props
 * @param {string} props.id - The card's unique ID.
 * @param {string} props.title - The card's title.
 * @param {string} props.content - The card's main content.
 * @param {boolean} props.generating - Whether the card is currently generating content.
 * @param {function} props.onGenerate - The callback to generate a new card.
 * @param {function} props.onConnect - The callback to initiate a card connection.
 * @param {boolean} props.isSelected - Whether this card is the currently selected one for connection.
 */

const CardContent = ({ id, title, content, generating, onGenerate, onConnect, isSelected }) => {
    const [isHovered, setIsHovered] = useState(false);
    const MAX_CHARS = 200;

    const safeContent = content || "";
    const truncatedText =
        safeContent.length > MAX_CHARS
            ? safeContent.slice(0, MAX_CHARS) + "..."
            : safeContent;

    return (
        <div
            className={`relative flex flex-col w-full h-full border-black border-2 p-0 bg-white shadow-md transition-transform duration-200`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="m-0 bg-black h-1/5 flex items-center justify-between px-2">
                <h1 className="text-sm text-white font-bold overflow-hidden text-ellipsis line-clamp-2">
                    {title || ""}
                </h1>
                <div className="flex space-x-1">
                    <button
                        onClick={(e) => { // e is the MouseEvent object for the click
                            e.stopPropagation(); // Prevents the event from bubbling up to parent elements
                            onConnect(id);
                        }}
                        className={`p-1 rounded-full text-white transition ${isSelected ? 'bg-blue-500 hover:bg-blue-600' : 'hover:bg-gray-700'}`}
                        title="Connect this card"
                    >
                        <Link size={16} />
                    </button>
                    <button
                        onClick={(e) => { // e is the MouseEvent object for the click
                            e.stopPropagation(); // Prevents the event from bubbling up
                            onGenerate(id);
                        }}
                        className="p-1 rounded-full text-white hover:bg-gray-700 transition"
                        title="Generate new card with Gemini"
                        disabled={generating}
                    >
                        {generating ? <LoadingSpinner /> : <Zap size={16} />}
                    </button>
                </div>
            </div>
            <div className="m-0 h-4/5 overflow-y-hidden px-2 py-1">
                <div className="text-xs font-medium text-gray-800 break-words">
                    {safeContent.length > MAX_CHARS && !isHovered ? (
                        <>
                            {truncatedText}
                            <span className="text-blue-500"> Read more...</span>
                        </>
                    ) : (
                        <div className="overflow-y-auto h-full pr-1">{safeContent}</div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * A reusable component that allows its children to be dragged and resized.
 * @param {object} props - This is where the `DraggableElement` receives all the properties
 * passed down to it from its parent component, `Home`.
 * @param {string} props.id - A unique ID for the element.
 * @param {object} props.pos - { x, y } current position in unscaled world coordinates.
 * @param {object} props.size - { width, height } current size in unscaled world coordinates.
 * @param {function} props.onDragStart - Callback to initiate dragging.
 * @param {function} props.onResizeStart - Callback to initiate resizing.
 * @param {React.ReactNode} props.children - The content.
 */
const DraggableElement = forwardRef(({ id, pos, size, onDragStart, onResizeStart, children }, ref) => { // forwardRef allows a parent component to pass a ref to a child component, which can then attach it to a DOM node.

    const handleMouseDown = useCallback((e) => { // e is the MouseEvent object
        // "Bubbling up" is when an event (like a mouse click or press) starts at the element you clicked on and then
        // travels up through all of its parent elements in the DOM tree, one by one.
        // e.stopPropagation() prevents the event from "bubbling up" to the main container,
        // so only the card's drag logic is triggered and not the container's.
        e.stopPropagation();
        e.preventDefault(); // Prevents default browser behavior like text selection
        // The `onDragStart` here is a function passed down from the parent `Home` component.
        // We are calling that function and passing it the mouse event and the card's ID.
        // This tells the parent that a card has started being dragged, and the parent can then
        // update the state to move the card.
        onDragStart(e, id);
    }, [id, onDragStart]);

    const handleResizeMouseDown = useCallback((e, direction) => { // e is the MouseEvent object
        e.stopPropagation(); // Prevents the event from bubbling up
        e.preventDefault(); // Prevents default browser behavior
        onResizeStart(e, id, direction); // Passes the event object, id, and direction
    }, [id, onResizeStart]);

    return (
        <div
            ref={ref} // The ref passed from the parent is attached here, allowing the parent to access this DOM node directly.
            id={id}
            data-element-id={id}
            className={`absolute select-none transition-transform duration-75 ease-out cursor-grab`}
            style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                width: size.width,
                height: size.height,
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="w-full h-full relative">
                {children}
            </div>

            {/* Resize handle */}
            <div onMouseDown={(e) => handleResizeMouseDown(e, 'bottom right')} className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-700"></div>
        </div>
    );
});


export default function Home() {
    const defaultCards = useMemo(() => [
        { id: 'card-1', title: 'What is the capital of France?', content: 'The capital of France is Paris. It is also the most populous city in the country.' },
        { id: 'card-2', title: 'What are the main functions of a web browser?', content: 'A web browser\'s main functions include fetching resources from web servers, interpreting and rendering HTML, CSS, and JavaScript, and providing a user interface for navigating the web.' },
        { id: 'card-3', title: 'How does the internet work?', content: 'The internet is a global network of interconnected computers that communicate using a standard set of protocols (TCP/IP). Data is broken down into packets, sent across the network, and reassembled at the destination.' },
        { id: 'card-4', title: 'Introduction to React', content: 'React is a JavaScript library for building user interfaces. It allows developers to create reusable UI components and manage their state efficiently.' },
    ], []);

    const [elements, setElements] = useState<DraggableElementData[]>([]);
    const [connections, setConnections] = useState([]);
    const [selectedCardId, setSelectedCardId] = useState(null);
   
    const containerRef = useRef(null); // This ref is used to get a direct reference to the main container div, which is necessary to measure its dimensions for calculating the arrow connection points.
    const elementRefs = useRef({}); // This ref is used to store a collection of refs, one for each DraggableElement component. This allows the parent component to imperatively access the DOM nodes of individual cards.
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

    const [scale, setScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // New state for canvas panning
    const [isPanning, setIsPanning] = useState(false); // New state to track if the canvas is being panned
    //above three variables are responsible for the zoom and pan functionality
    const [draggingElementId, setDraggingElementId] = useState(null);
    const [resizingElementId, setResizingElementId] = useState(null);
    const startMousePosition = useRef({ x: 0, y: 0, pos: { x: 0, y: 0 }, size: { width: 0, height: 0 }, direction: '' }); // Stores the starting mouse position and element state for drag/resize operations. This mutable object is updated frequently and doesn't need to cause a re-render, making useRef ideal for performance.

    // This useEffect is responsible for setting up the initial, default cards ONLY.
    // It runs once when the component first mounts because the dependency array `[]` is empty.
    // This hook does NOT run for newly generated cards.
    useEffect(() => {
        if (elements.length === 0) {
            setElements(
                defaultCards.map((card, index) => { // The `map()` function automatically provides the `index` (0, 1, 2, ...) for each item in the array.
                    const gridX = index % 3; // `gridX` is the column. The modulo operator (%) ensures it cycles through 0, 1, 2, 0, 1, 2...
                    const gridY = Math.floor(index / 3); // `gridY` is the row. `Math.floor()` ensures it increments for every 3 cards, creating a new row.
                    return {
                        ...card,
                        // This calculation uses `gridX` and `gridY` to place cards neatly in a grid.
                        pos: { x: 50 + gridX * 350, y: 50 + gridY * 250 },
                        size: { width: 300, height: 200 },
                    };
                })
            );
        }
    }, [defaultCards, elements.length]);

    // Use a layout effect to get the container dimensions on mount and resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) { // We access the DOM element via .current.
                const rect = containerRef.current.getBoundingClientRect();
                setContainerDimensions({ width: rect.width, height: rect.height });
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleWheel = useCallback((e) => { // e is the WheelEvent object
        e.preventDefault(); // Prevents the default scroll behavior
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomAmount = e.deltaY > 0 ? -0.1 : 0.1; // e.deltaY indicates the scroll direction and magnitude
        // The key change here: Math.max(0.01, newScale) ensures the scale never drops below 0.01, preventing the "flip".
        const newScale = Math.max(0.01, scale + zoomAmount);
        const scaleRatio = newScale / scale;

        setPanOffset(prev => ({
            x: mouseX - scaleRatio * (mouseX - prev.x),
            y: mouseY - scaleRatio * (mouseY - prev.y),
        }));
        setScale(newScale);
    }, [scale]);

    /**
     * Returns the unscaled bounds of a card.
     */
    const getElementBounds = useCallback((id) => {
        const element = elements.find(el => el.id === id);
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
            center: {
                x: pos.x + size.width / 2,
                y: pos.y + size.height / 2,
            }
        };
    }, [elements]);


    /**
     * Calculates the intersection point of a line segment from the card's center
     * to another point (like another card's center) with the card's bounding box.
     * This robust implementation checks against all four boundaries.
     * @param {object} cardBounds - The bounds of the card.
     * @param {object} otherPoint - The point to which the line is drawn.
     * @returns {object|null} The {x, y} intersection point or null if no point can be calculated.
     */
    const getCardEdgePoint = useCallback((cardBounds, otherPoint) => {
        if (!cardBounds || !otherPoint) return null;

        const { left, top, right, bottom, center } = cardBounds;

        const dx = otherPoint.x - center.x;
        const dy = otherPoint.y - center.y;

        // Use a small epsilon to handle near-zero values and avoid division by zero.
        const epsilon = 1e-6;

        const potentialPoints = [];

        // Calculate intersection with top edge (y = top)
        if (Math.abs(dy) > epsilon) {
            const x_top = center.x + (dx / dy) * (top - center.y);
            if (x_top >= left - epsilon && x_top <= right + epsilon) {
                potentialPoints.push({ x: x_top, y: top });
            }
        }

        // Calculate intersection with bottom edge (y = bottom)
        if (Math.abs(dy) > epsilon) {
            const x_bottom = center.x + (dx / dy) * (bottom - center.y);
            if (x_bottom >= left - epsilon && x_bottom <= right + epsilon) {
                potentialPoints.push({ x: x_bottom, y: bottom });
            }
        }

        // Calculate intersection with left edge (x = left)
        if (Math.abs(dx) > epsilon) {
            const y_left = center.y + (dy / dx) * (left - center.x);
            if (y_left >= top - epsilon && y_left <= bottom + epsilon) {
                potentialPoints.push({ x: left, y: y_left });
            }
        }

        // Calculate intersection with right edge (x = right)
        if (Math.abs(dx) > epsilon) {
            const y_right = center.y + (dy / dx) * (right - center.x);
            if (y_right >= top - epsilon && y_right <= bottom + epsilon) {
                potentialPoints.push({ x: right, y: y_right });
            }
        }

        // Handle the case of perfectly horizontal or vertical lines
        if (Math.abs(dx) < epsilon) { // Vertical line
            if (dy > 0) potentialPoints.push({ x: center.x, y: bottom });
            else if (dy < 0) potentialPoints.push({ x: center.x, y: top });
        }
        if (Math.abs(dy) < epsilon) { // Horizontal line
            if (dx > 0) potentialPoints.push({ x: right, y: center.y });
            else if (dx < 0) potentialPoints.push({ x: left, y: center.y });
        }


        if (potentialPoints.length === 0) return null;

        // Find the point that is closest to the otherPoint, and make sure it's not the center itself
        const closestPoint = potentialPoints.reduce((closest, current) => {
            const distToCurrent = Math.sqrt(Math.pow(current.x - otherPoint.x, 2) + Math.pow(current.y - otherPoint.y, 2));
            const distToClosest = closest ? Math.sqrt(Math.pow(closest.x - otherPoint.x, 2) + Math.pow(closest.y - otherPoint.y, 2)) : Infinity;
            return distToCurrent < distToClosest ? current : closest;
        }, null);

        return closestPoint;
    }, []);

    /**
     * Calculates the starting and ending points for a permanent arrow in unscaled coordinates.
     */
    const getArrowEndpoint = useCallback((startElementId, endElementId) => {
        const startBounds = getElementBounds(startElementId);
        const endBounds = getElementBounds(endElementId);
        if (!startBounds || !endBounds) return null;

        // The start point is the intersection on the start card, pointing towards the end card's center.
        const startPoint = getCardEdgePoint(startBounds, endBounds.center);
        // The end point is the intersection on the end card, pointing towards the start card's center.
        const endPoint = getCardEdgePoint(endBounds, startBounds.center);

        return { start: startPoint, end: endPoint };
    }, [getElementBounds, getCardEdgePoint]);


    const handleDragStart = useCallback((e, id) => { // e is the MouseEvent object
        const element = elements.find(el => el.id === id);
        if (!element || !element.pos) return;
        setDraggingElementId(id);
        startMousePosition.current = { x: e.clientX, y: e.clientY, pos: element.pos }; // We read from and write to the .current property of the ref.
    }, [elements]);

    const handleResizeStart = useCallback((e, id, direction) => { // e is the MouseEvent object
        const element = elements.find(el => el.id === id);
        if (!element || !element.size) return;
        setResizingElementId(id);
        startMousePosition.current = { x: e.clientX, y: e.clientY, size: element.size, direction }; // We read from and write to the .current property of the ref.
    }, [elements]);

    /**
     * New click handler for the two-step connection process.
     */
    const handleConnectClick = useCallback((id) => {
        // If a card is already selected...
        if (selectedCardId) {
            // Check if it's the same card
            if (selectedCardId === id) {
                setSelectedCardId(null); // Deselect the card
            } else {
                // It's a different card, so create a new connection
                const exists = connections.some(c =>
                    (c.from === selectedCardId && c.to === id) ||
                    (c.from === id && c.to === selectedCardId)
                );
                if (!exists) {
                    setConnections(prev => [...prev, { from: selectedCardId, to: id }]);
                }
                setSelectedCardId(null); // Reset selection
            }
        } else {
            // No card selected, so this is the first selection
            setSelectedCardId(id);
        }
    }, [selectedCardId, connections]);

    // New event handler to start panning the canvas
    const handleCanvasMouseDown = useCallback((e) => {
        // Check if the click target is the container itself, not a card
        if (e.target === containerRef.current) {
            e.preventDefault();
            setIsPanning(true);
            startMousePosition.current = { x: e.clientX, y: e.clientY, pos: panOffset };
        }
    }, [panOffset]);


    const handleContainerMouseMove = useCallback((e) => { // e is the MouseEvent object
        if (!containerRef.current) return;

        if (isPanning) {
            const dx = e.clientX - startMousePosition.current.x;
            const dy = e.clientY - startMousePosition.current.y;

            setPanOffset(prev => ({
                x: startMousePosition.current.pos.x + dx,
                y: startMousePosition.current.pos.y + dy,
            }));
        }

        if (draggingElementId) {
            const dx = (e.clientX - startMousePosition.current.x) / scale; // We read the value from the .current property.
            const dy = (e.clientY - startMousePosition.current.y) / scale; // We read the value from the .current property.

            const newPos = {
                x: startMousePosition.current.pos.x + dx,
                y: startMousePosition.current.pos.y + dy,
            };

            setElements(prevElements =>
                prevElements.map(el => el.id === draggingElementId ? { ...el, pos: newPos } : el)
            );
        } else if (resizingElementId) {
            const { x: startX, y: startY } = startMousePosition.current; // We read the value from the .current property.
            const { width: startWidth, height: startHeight } = startMousePosition.current.size;
            const { direction } = startMousePosition.current;

            const dx = (e.clientX - startX) / scale; // We read the value from the .current property.
            const dy = (e.clientY - startY) / scale; // We read the value from the .current property.

            let newWidth = startWidth;
            let newHeight = startHeight;

            if (direction.includes('right')) newWidth = Math.max(100, startWidth + dx);
            if (direction.includes('bottom')) newHeight = Math.max(100, startHeight + dy);

            setElements(prevElements =>
                prevElements.map(el => el.id === resizingElementId ? { ...el, size: { width: newWidth, height: newHeight } } : el)
            );
        }
    }, [isPanning, draggingElementId, resizingElementId, scale, panOffset]);

    const handleContainerMouseUp = useCallback((e) => { // e is the MouseEvent object
        if (draggingElementId) {
            setDraggingElementId(null);
        } else if (resizingElementId) {
            setResizingElementId(null);
        } else if (isPanning) {
            setIsPanning(false);
        }
    }, [draggingElementId, resizingElementId, isPanning]);

    const generateCardWithGemini = useCallback(async (sourceCardId) => {
        // Step 1: Find the source card and set the generating state to true to show the loading spinner.
        const sourceCard = elements.find(el => el.id === sourceCardId);
        if (!sourceCard || sourceCard.generating) return;

        setElements(prevElements => prevElements.map(el =>
            el.id === sourceCardId ? { ...el, generating: true } : el
        ));

        // Step 2: Construct the prompt for the Gemini API call.
        // The prompt instructs the model to create a new concept based on the source card's content.
        const prompt = `Based on the following text, create a new related concept with a title and a brief explanation. Respond with a JSON object containing two string properties: "title" and "content". Text: ${sourceCard.content}`;

        // Step 3: Implement exponential backoff for retries to handle potential API failures.
        let retryCount = 0;
        const maxRetries = 5;
        let success = false;

        while (retryCount < maxRetries && !success) {
            try {
                const chatHistory = [];
                chatHistory.push({ role: "user", parts: [{ text: prompt }] });
                const payload = {
                    contents: chatHistory,
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "OBJECT",
                            properties: {
                                "title": { "type": "STRING" },
                                "content": { "type": "STRING" }
                            },
                            "propertyOrdering": ["title", "content"]
                        }
                    }
                };

                const apiKey = "";
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

                // Step 4: Make the fetch call to the Gemini API.
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                // If the response is not OK, throw an error to be caught by the try/catch block.
                if (!response.ok) {
                    throw new Error(`API call failed with status: ${response.status}`);
                }

                const result = await response.json();

                // Step 5: Process the successful JSON response.
                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const json = result.candidates[0].content.parts[0].text;
                    const newCardData = JSON.parse(json);

                    if (newCardData.title && newCardData.content) {
                        // Step 6: Create a new card object with a new position and add it to the state.
                        // When a new card is generated, its position is calculated dynamically.
                        // The `elements.length` gives us the current number of cards, which acts as the 'index'.
                        const newIndex = elements.length;
                        const gridX = newIndex % 3; // The new card's column is determined here.
                        const gridY = Math.floor(newIndex / 3); // The new card's row is determined here.
                        const newCard = {
                            id: `card-${Date.now()}`,
                            pos: { x: 50 + gridX * 350, y: 50 + gridY * 250 },
                            size: { width: 300, height: 200 },
                            title: newCardData.title,
                            content: newCardData.content,
                        };
                        setElements(prevElements => [...prevElements, newCard]);
                        success = true;
                    }
                }
            } catch (error) {
                // Step 7: Handle errors and apply exponential backoff delay.
                console.error("Error generating card with Gemini:", error);
                retryCount++;
                const delay = Math.pow(2, retryCount) * 1000;
                await new Promise(res => setTimeout(res, delay));
            }
        }

        // Step 8: Reset the generating state regardless of success or failure.
        setElements(prevElements => prevElements.map(el =>
            el.id === sourceCardId ? { ...el, generating: false } : el
        ));

    }, [elements]);

    const clearConnections = useCallback(() => {
        setConnections([]);
        setSelectedCardId(null);
    }, []);

    const addNewCard = useCallback(() => {
        // When a new card is added manually, its position is calculated dynamically.
        // The `elements.length` gives us the current number of cards, which acts as the 'index'.
        const newIndex = elements.length;
        const gridX = newIndex % 3; // The new card's column is determined here.
        const gridY = Math.floor(newIndex / 3); // The new card's row is determined here.
        const newCard = {
            id: `card-${Date.now()}`,
            pos: { x: 50 + gridX * 350, y: 50 + gridY * 250 },
            size: { width: 300, height: 200 },
            title: 'New Card Title',
            content: 'This is a new card with some default content. Drag me around or resize me!',
        };
        setElements(prevElements => [...prevElements, newCard]);
    }, [elements]);

    // New function to reset the view to the initial state
    const resetView = useCallback(() => {
        setScale(1);
        setPanOffset({ x: 0, y: 0 });
    }, []);

    return (
        <div className="flex min-h-screen w-full h-full font-inter bg-gray-50">
            {/* Sidebar */}
            <div className="flex flex-col items-center w-1/12 h-full bg-gray-100 p-2 border-r border-gray-200">
                <div className="bg-white rounded-lg shadow-lg p-4 w-full flex flex-col items-center">
                    <h1 className="text-sm mb-2 text-center font-bold text-gray-800">Controls</h1>
                    <div className="flex flex-col gap-2 w-full">
                        <button
                            onClick={() => setScale((z) => Math.max(0.01, z - 0.1))}
                            className="p-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                            title="Zoom Out"
                        >
                            <Minus size={16} className="mx-auto" />
                        </button>
                        <button
                            onClick={() => setScale((z) => z + 0.1)}
                            className="p-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                            title="Zoom In"
                        >
                            <Plus size={16} className="mx-auto" />
                        </button>
                        <button
                            onClick={resetView}
                            className="p-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                            title="Reset View"
                        >
                            <MonitorX size={16} className="mx-auto" />
                        </button>
                        <div className="h-px w-full bg-gray-300 my-2"></div>
                        <button
                            onClick={clearConnections}
                            className="p-2 bg-gray-200 rounded-full shadow hover:bg-gray-300 transition w-full"
                            title="Clear all connections"
                        >
                            <Trash2 size={16} className="text-red-500 mx-auto" />
                        </button>
                        <button
                            onClick={addNewCard}
                            className="p-2 bg-gray-200 rounded-full shadow hover:bg-gray-300 transition w-full"
                            title="Add a new card"
                        >
                            <MessageSquarePlus size={16} className="mx-auto" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Card Area and SVG for connectors */}
            <div
                className="flex-1 w-11/12 bg-gray-100 relative overflow-hidden touch-none"
                ref={containerRef} // This ref is attached to the main container div.
                onMouseMove={handleContainerMouseMove}
                onMouseUp={handleContainerMouseUp}
                onMouseDown={handleCanvasMouseDown} // New event handler for canvas panning
                onWheel={handleWheel}
            >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-md text-sm text-gray-800 z-50">
                    Click the <Link size={16} className="inline-block text-blue-500" /> icon on two cards to create a connection.
                </div>

                {/* SVG for connections, now outside the scaled div */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-20">
                    <defs>
                        {/* This marker is a triangle that acts as the arrowhead. */}
                        <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4b5563" />
                        </marker>
                    </defs>
                    {connections.map((conn, index) => {
                        const endpoints = getArrowEndpoint(conn.from, conn.to);
                        if (!endpoints) return null;

                        // Apply the current scale and pan offset to the unscaled coordinates
                        const scaledStart = {
                            x: (endpoints.start.x * scale) + panOffset.x,
                            y: (endpoints.start.y * scale) + panOffset.y,
                        };
                        const scaledEnd = {
                            x: (endpoints.end.x * scale) + panOffset.x,
                            y: (endpoints.end.y * scale) + panOffset.y,
                        };

                        return (
                            <ArrowConnector key={index} start={scaledStart} end={scaledEnd} />
                        );
                    })}
                </svg>

                {/* This div contains all the cards and is the target of the scale and pan transform */}
                <div
                    className="relative w-full h-full"
                    style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
                        transformOrigin: 'top left',
                    }}
                >
                    {elements.map((el) => (
                        el.pos && el.size && (
                            // This is where the `Home` component passes props to `DraggableElement`.
                            // The attributes `id`, `pos`, `size`, `onDragStart`, and `onResizeStart`
                            // are all props that the `DraggableElement` component will receive.
                            // This happens every time the `Home` component re-renders (e.g., when the `elements` state changes).
                            <DraggableElement
                                key={el.id}
                                id={el.id}
                                pos={el.pos}
                                size={el.size}
                                onDragStart={handleDragStart}
                                onResizeStart={handleResizeStart}
                                ref={instance => { // When this component is rendered, React calls this function and gives us the `instance` of the DOM node.
                                    if (instance) {
                                        // This line stores the live DOM node (`instance`) in our `elementRefs` object,
                                        // using the card's ID (`el.id`) as the key. This is like adding an entry
                                        // to a phone book so we can look up this specific card's location later.
                                        elementRefs.current[el.id] = instance;
                                    } else {
                                        // This is for cleanup. If the component is removed from the screen,
                                        // this code runs to remove its entry from our "phone book" to prevent memory leaks.
                                        delete elementRefs.current[el.id];
                                    }
                                }}
                            >
                                <CardContent
                                    id={el.id}
                                    title={el.title}
                                    content={el.content}
                                    onGenerate={generateCardWithGemini}
                                    onConnect={handleConnectClick}
                                    isSelected={el.id === selectedCardId}
                                    generating={el.generating}
                                />
                            </DraggableElement>
                        )
                    ))}
                </div>
            </div>
        </div>
    );
}
