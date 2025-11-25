// background.js — VERSÃO FINAL 100% LIMPA (NENHUM launchWebAuthFlow)

const CLIENT_ID = "100486490864-t2anvobl2aig0uo0al6hkckpfk0i64on.apps.googleusercontent.com";
const REDIRECT_URI = "https://mailmind-backend-09hd.onrender.com/auth/google/callback";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "login") {
    const verifier = crypto.randomUUID().replace(/-/g, "").substring(0, 43);
    
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
      .then(buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""))
      .then(challenge => {
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=openid%20email%20profile&code_challenge=${challenge}&code_challenge_method=S256&state=${btoa(verifier)}`;
        chrome.tabs.create({ url, active: true });
        sendResponse({ ok: true });
      })
      .catch(err => sendResponse({ error: err.message }));

    return true;
  }

  if (msg.type === "get_session") {
    chrome.storage.local.get(["user_profile"], sendResponse);
    return true;
  }

  if (msg.type === "logout") {
    chrome.storage.local.clear(() => {
      sendResponse({ ok: true });
      chrome.runtime.sendMessage({ type: "REFRESH" }).catch(() => {});
    });
    return true;
  }

  return false;
});

chrome.runtime.onMessageExternal.addListener((msg) => {
  if (msg.type === "LOGIN_SUCCESS" && msg.user) {
    chrome.storage.local.set({ user_profile: msg.user }, () => {
      chrome.runtime.sendMessage({ type: "REFRESH" });
    });
  }
});
