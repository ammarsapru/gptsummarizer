"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import AuthModal from "./AuthModal";

function FullScreenSpinner() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-white/60">
      <div className="animate-spin h-8 w-8 rounded-full border-4 border-black/20 border-t-black" />
    </div>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "authed" | "unauth">("checking");

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      // 1) Get local session (may be stale)
      const { data: { session } } = await supabase.auth.getSession();

      // 2) Hard-verify the user on the server
      const { data: userData, error } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !userData?.user) {
        // Local token is bad or user deleted → sign out & show modal
        await supabase.auth.signOut();
        setStatus("unauth");
        return;
      }

      // Looks good
      setStatus("authed");
    }

    bootstrap();

    // 3) React to live auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setStatus("unauth");
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const { data: userData, error } = await supabase.auth.getUser();
        if (error || !userData?.user) {
          await supabase.auth.signOut();
          setStatus("unauth");
        } else {
          setStatus("authed");
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (status === "checking") return <FullScreenSpinner />;
  if (status === "unauth") return <AuthModal />;

  return <>{children}</>;
}
