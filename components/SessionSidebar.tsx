"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabase/client";

type SessionRow = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string | null;
};

export default function SessionsSidebar({
  activeSessionId,
  onSelect,
}: {
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
}) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (!error && data) setSessions(data as SessionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
    // simple realtime for inserts/updates
    const channel = supabase
      .channel("public:sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => fetchSessions()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchSessions]);

  return (
    <div className="w-full h-64 overflow-y-auto rounded-md border bg-white">
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
        Your sessions
      </div>
      {loading ? (
        <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500">No sessions yet</div>
      ) : (
        <ul className="divide-y">
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <li key={s.id}>
                <button
                  onClick={() => onSelect(s.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                    isActive ? "bg-gray-200" : ""
                  }`}
                  title={s.title ?? s.id}
                >
                  <div className="font-medium truncate">
                    {s.title || "Untitled session"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(s.updated_at ?? s.created_at).toLocaleString()}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
