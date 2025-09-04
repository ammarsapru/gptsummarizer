// content.js
let intervalId = null;
let lastCount = 0;

function extractChatPairsFromDOM() {
  console.log("Extracting chat pairs from DOM...");
  const pairs = [];
  const articles = document.querySelectorAll("article[data-testid^='conversation-turn']");
  const scope = document.querySelector('#history aside');
  // “Inside the element with id history, give me the first <aside> you find.”

  const activeLink =
    scope?.querySelector('a[data-active="true"]') ||
    scope?.querySelector('a[data-active]') ||
    scope?.querySelector('a[aria-current="page"]');

  const labelNode =
    activeLink?.querySelector(':scope > div > div') ||
    activeLink?.querySelector(':scope .title, :scope .truncate, :scope [data-fill]') ||
    activeLink?.querySelector(':scope div div');
  // :scope = “treat the current element (the anchor) as the root for this selector.”

  const sessionTitle =
    ((labelNode?.textContent || '').replace(/\s+/g, ' ').trim()) || 'Untitled';
  console.log(`Session title: ${sessionTitle}`);

  for (let i = 0; i < articles.length - 1; i++) {
    const current = articles[i];
    const next = articles[i + 1];
    const userLabel = current.querySelector("h5");
    const assistantLabel = next?.querySelector("h6");



    if (
      userLabel?.textContent.trim() === "You said:" &&
      assistantLabel?.textContent.trim() === "ChatGPT said:"
    ) {
      const userText = current.querySelector('[data-message-author-role="user"]')?.innerText.trim();
      const assistantText = next.querySelector('[data-message-author-role="assistant"], div[class*="markdown"]')?.innerText.trim();

      if (userText && assistantText) {
        pairs.push({ user: userText, assistant: assistantText });
        i++;
      }
    }
  }

  return pairs;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start-scrape") {
    console.log("Starting chat scraping...");
    // ✅ First extraction immediately
    const initialPairs = extractChatPairsFromDOM();
    lastCount = initialPairs.length;
    const {access_token} =  chrome.storage.local.get("access_token");

    fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json",
         ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
       },
      body: JSON.stringify(initialPairs),
    }).then(() => {
      console.log("Initial chat data sent to server.");
      window.postMessage({ type: "new-chat-data" }, "*");
    });

    // 🔁 Continue polling
    intervalId = setInterval(() => {
      console.log("Polling for new chat data...");
      const allPairs = extractChatPairsFromDOM();
      if (allPairs.length > lastCount) {
        const newPairs = allPairs.slice(lastCount);
        lastCount = allPairs.length;

        fetch("http://localhost:3000/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json",
            ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
           },
          body: JSON.stringify(newPairs),
        }).then(() => {
          window.postMessage({ type: "new-chat-data" }, "*");
        });
      }
    }, 2000);

    sendResponse({ status: "started" });
    return true;
  }


  if (request.action === "stop-scrape") {
    console.log("Stopping chat scraping...");
    clearInterval(intervalId);
    intervalId = null;
    lastCount = 0;
    sendResponse({ status: "stopped" });
    return true;
  }
});
