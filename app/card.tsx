"use client";

import { useState } from "react";
import { Link } from "lucide-react"; // Import the icon

interface CardProps {
  id: string;
  user: string;
  assistant: string;
  onConnect: (id: string) => void;
  isSelected: boolean;
}

export default function Card({ id, user, assistant, onConnect, isSelected }: CardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const MAX_CHARS = 750;

  const safeAssistant = assistant || "";
  const truncatedText =
    safeAssistant.length > MAX_CHARS
      ? safeAssistant.slice(0, MAX_CHARS) + "..."
      : safeAssistant;

  return (
    <div
      className={`relative m-0 flex flex-col w-full h-full border-black rounded-xl border-2 p-0 bg-white shadow-md transition-transform duration-200 
        ${isHovered ? "scale-105 z-50" : ""
        }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="m-0 bg-black h-1/5 flex items-center justify-between px-2 rounded-lg">
        <h1 className="text-sm text-white overflow-hidden text-ellipsis line-clamp-2 font-field-mono">
          {user || ""}
        </h1>
        <div className="flex space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConnect(id);
            }}
            className={`p-1 rounded-full text-white transition ${isSelected ? 'bg-blue-500 hover:bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Connect this card"
          >
            <Link size={16} />
          </button>
        </div>
      </div>
      <div className="m-0 h-4/5 px-2 py-1 overflow-hidden">
        <div className="text-sm font-medium text-gray-800 break-words font-field-mono">
          {safeAssistant.length > MAX_CHARS && !isHovered ? (
            <>
              {truncatedText}
              <span className="text-blue-500"> Read more...</span>
            </>
          ) : (
            <div className="text-sm font-medium text-gray-800 break-words font-field-mono overflow-y-auto h-full pr-1">
              {safeAssistant}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
