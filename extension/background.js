(async () => {
  const { isRecording: saved } = await chrome.storage.local.get('isRecording');
  isRecording = !!saved;
  await chrome.action.setTitle({ title: isRecording ? 'Recording…' : 'Click to start recording' });

  if (isRecording) {
    await setBadgeMode('solid');                  // draw badge immediately
    chrome.alarms.create('rec-pulse', { periodInMinutes: 1 / 60 }); // resume pulse
  } else {
    await setBadgeMode('off');
  }
})();
// Single source of truth
let isRecording = false;   // current state
let pulseOn = false;       // blink phase

// Draw helper (unchanged from your version)
async function setBadgeMode(mode) {
  const GREEN = [16, 185, 129, 255];

  if (mode === 'off') {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  if (mode === 'dot') {
    await chrome.action.setBadgeText({ text: "●" });
    await chrome.action.setBadgeTextColor?.({ color: GREEN });
    await chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 160] });
    return;
  }
  if (mode === 'solid') {
    await chrome.action.setBadgeBackgroundColor({ color: GREEN });
    await chrome.action.setBadgeText({ text: " " }); // tiny space so the solid bg renders everywhere
    return;
  }
}

// 🔔 Pulse tick: flip between 'dot' and 'solid' once per second
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'rec-pulse') return;
  if (!isRecording) return;
  pulseOn = !pulseOn;
  await setBadgeMode(pulseOn ? 'dot' : 'solid');
});

// 📨 Central message handler (popup or content can call this)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    if (request.action === "start-scrape") {
      isRecording = true;                           // 1) update memory
      await chrome.storage.local.set({ isRecording }); // 2) persist state
      await chrome.action.setTitle({ title: "Recording…" });

      // 3) immediate user feedback: turn badge green NOW
      pulseOn = false;
      await setBadgeMode('solid');

      // 4) start the 1s “pulse” alarm (MV3-friendly timer)
      chrome.alarms.create('rec-pulse', { periodInMinutes: 1 / 60 });

      // 5) tell the active tab to begin scraping (background orchestrates)
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: 'start-scrape' });
    }

    if (request.action === "stop-scrape") {
      isRecording = false;
      await chrome.storage.local.set({ isRecording });
      await chrome.action.setTitle({ title: "Click to start recording" });

      // stop pulsing and clear badge
      chrome.alarms.clear('rec-pulse');
      await setBadgeMode('off');

      // notify tab to stop scraping
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: 'stop-scrape' });
    }

    sendResponse({ ok: true });
  })();

  // Keep the service worker alive while the async work finishes
  return true;
});

// ✅ (Optional but recommended) restore badge on startup/install
chrome.runtime.onStartup.addListener(async () => {
  const { isRecording: saved } = await chrome.storage.local.get('isRecording');
  isRecording = !!saved;
  await chrome.action.setTitle({ title: isRecording ? 'Recording…' : 'Click to start recording' });
  if (isRecording) {
    await setBadgeMode('solid');
    chrome.alarms.create('rec-pulse', { periodInMinutes: 1 / 60 });
  } else {
    await setBadgeMode('off');
  }
});
chrome.runtime.onInstalled.addListener(async () => {
  const { isRecording: saved } = await chrome.storage.local.get('isRecording');
  isRecording = !!saved;
  await chrome.action.setTitle({ title: isRecording ? 'Recording…' : 'Click to start recording' });
  if (isRecording) {
    await setBadgeMode('solid');
    chrome.alarms.create('rec-pulse', { periodInMinutes: 1 / 60 });
  } else {
    await setBadgeMode('off');
  }
});
