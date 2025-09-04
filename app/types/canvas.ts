export interface ChatPair {
  user: string;
  assistant: string;
}

export interface Size {
  width: number;
  height: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface DraggableElementData {
  id: string;
  pos?: Vec2;               // WORLD coordinates
  size?: Size;
  user: string;
  assistant: string;
  generating?: boolean;
}
