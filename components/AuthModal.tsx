"use client";
import { useState } from "react";
import { supabase } from "@/utils/supabase/client";

export default function AuthModal() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // If confirmations are ON: user must check email. Session remains null until confirmed.
        if (!data.session) {
          setInfo("Check your email to confirm your account, then come back and sign in.");
        }
        // If confirmations are OFF: onAuthStateChange will flip the gate to "authed".
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange will close the modal by switching the gate to "authed".
      }
    } catch (e: any) {
      setErr(e.message ?? "Authentication error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex gap-2">
          <button
            className={`px-3 py-1 rounded ${mode === "signup" ? "bg-black text-white" : "bg-gray-200"}`}
            onClick={() => setMode("signup")}
            disabled={busy}
          >
            Create account
          </button>
          <button
            className={`px-3 py-1 rounded ${mode === "signin" ? "bg-black text-white" : "bg-gray-200"}`}
            onClick={() => setMode("signin")}
            disabled={busy}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            className="w-full rounded border px-3 py-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={busy}
            autoComplete="email"
          />
          <input
            type="password"
            className="w-full rounded border px-3 py-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            disabled={busy}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />

          {err && <p className="text-sm text-red-600">{err}</p>}
          {info && <p className="text-sm text-blue-700">{info}</p>}

          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
