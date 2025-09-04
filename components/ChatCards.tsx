// hooks/useChatData.ts
import { useEffect, useState } from "react";

export interface ChatPair {
  user: string;
  assistant: string;
}

export function useChatData() {
  const [chatPairs, setChatPairs] = useState<ChatPair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get("chatPairs", (result) => {
      setChatPairs(result.chatPairs || []);
      setLoading(false);
    });
  }, []);

  return { chatPairs, loading };
}
