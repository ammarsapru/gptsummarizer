// popup/popup.js

// --------- your existing DOM refs ----------
const toggleBtn = document.getElementById("toggle");
const statusText = document.getElementById("status");

// --------- NEW: auth DOM refs ---------------
const authBox = document.getElementById("auth");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signInBtn = document.getElementById("signin");
const signUpBtn = document.getElementById("signup");
const authMsg = document.getElementById("auth-msg");

// --------- NEW: create Supabase client (from UMD + config) ----------
const supa = window.supabase.createClient(
  window.__SUPABASE.url,
  window.__SUPABASE.anonKey
);

// Small helpers to swap UI
function showAuth(show) {
  authBox.classList.toggle("hidden", !show);
  toggleBtn.disabled = show; // disable Start/Stop if not logged in
  statusText.textContent = show ? "Sign in to use the recorder" : "Press to start recording";
}

// Load: check if already logged in; hydrate popup
document.addEventListener("DOMContentLoaded", async () => {
  // Ask Supabase for current session
  const { data: sess } = await supa.auth.getSession();
  const token = sess?.session?.access_token || null;
  const email = sess?.session?.user?.email || null;

  if (token && email) {
    // Save for content/background to read
    await chrome.storage.local.set({ access_token: token, user_email: email });
    showAuth(false);
  } else {
    showAuth(true);
  }
});

// Sign in/up handlers (very minimal)
async function handleAuth(kind) {
  authMsg.textContent = "";
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    authMsg.textContent = "Email and password required.";
    return;
  }

  try {
    if (kind === "signin") {
      const { error } = await supa.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const { error } = await supa.auth.signUp({ email, password });
      if (error) throw error;
      // If email confirmation is enabled, user may need to confirm before session exists
    }

    // Fetch fresh session
    const { data: sess } = await supa.auth.getSession();
    const token = sess?.session?.access_token || null;
    const userEmail = sess?.session?.user?.email || null;

    if (!token) {
      authMsg.textContent = "Check your email to confirm your account.";
      return;
    }

    // Persist for other parts of the extension
    await chrome.storage.local.set({ access_token: token, user_email: userEmail });

    // Success → hide auth UI
    showAuth(false);
  } catch (e) {
    authMsg.textContent = e.message || "Auth failed";
  }
}

signInBtn?.addEventListener("click", () => handleAuth("signin"));
signUpBtn?.addEventListener("click", () => handleAuth("signup"));

// ---------- YOUR EXISTING RECORDING LOGIC (unchanged) ----------
toggleBtn.addEventListener("click", async () => {
  // Double-check logged in before allowing record
  const { access_token } = await chrome.storage.local.get("access_token");
  if (!access_token) {
    showAuth(true);
    return;
  }

  // Flip UI state locally
  let isRecording = false;
  {
    const saved = await chrome.storage.local.get("isRecording");
    isRecording = !!saved.isRecording;
  }
  const next = !isRecording;

  // 1) Tell the content script (to start/stop scraping)
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(
      tab.id,
      { action: next ? "start-scrape" : "stop-scrape" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Extension error:", chrome.runtime.lastError.message);
          statusText.textContent = "ChatGPT page not found.";
          return;
        }
        statusText.textContent = next ? "Recording..." : "Recording is finished. Chat saved.";
        toggleBtn.textContent = next ? "Stop" : "Start";
      }
    );
  }

  // 2) Tell the background (to update badge/pulse + persist isRecording)
  chrome.runtime.sendMessage({ action: next ? "start-scrape" : "stop-scrape" });
});
