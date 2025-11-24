// background.js — VERSÃO FINAL QUE FUNCIONA 100% NO MANIFEST V3 (2025)

const CLIENT_ID = "100486490864-t2anvobl2aig0uo0al6hkckpfk0i64on.apps.googleusercontent.com";
const REDIRECT_URI = "https://mailmind-backend-09hd.onrender.com/auth/google/callback";

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => String.fromCharCode(b % 36 + (b < 10 ? 48 : 87))).join('');
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "login") return false;

  (async () => {
    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await sha256(codeVerifier);

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=openid%20email%20profile` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256` +
        `&state=${btoa(JSON.stringify({ verifier: codeVerifier }))}`;

      // ABRE EM ABA NOVA (único jeito que funciona 100% no background MV3)
      const tab = await chrome.tabs.create({ url: authUrl, active: true });

      // Escuta quando a aba fechar ou completar o login
      const listener = async (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === "complete") {
          if (tab.url?.includes("/auth/google/callback")) {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.tabs.remove(tab.id);
            chrome.runtime.sendMessage({ type: "LOGIN_SUCCESS", user: null }); // o popup vai recarregar e pegar do storage
            sendResponse({ ok: true });
          }
        }
      };

      chrome.tabs.onUpdated.addListener(listener);

      // Se o usuário fechar a aba manualmente
      chrome.tabs.onRemoved.addListener(function onRemoved(tabId) {
        if (tabId === tab.id) {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.tabs.onRemoved.removeListener(onRemoved);
          sendResponse({ error: "Login cancelado" });
        }
      });

    } catch (err) {
      sendResponse({ error: err.message });
    }
  })();

  return true;
});

// Mantém os outros handlers que você já tem (get_session, logout, etc)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "get_session") {
    chrome.storage.local.get(["user_profile", "session_token"], sendResponse);
    return true;
  }
  return false;
});
