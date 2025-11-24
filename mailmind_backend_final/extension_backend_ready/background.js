// background.js — VERSÃO FINAL QUE NUNCA FALHA (DEZEMBRO 2025)

const CLIENT_ID = "100486490864-t2anvobl2aig0uo0al6hkckpfk0i64on.apps.googleusercontent.com";
const REDIRECT_URI = "https://mailmind-backend-09hd.onrender.com/auth/google/callback";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== "login") return false;

  // Gera PKCE
  const verifier = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
    .then(buffer => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''))
    .then(hash => {
      const challenge = btoa(hash).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=openid%20email%20profile` +
        `&code_challenge=${challenge}` +
        `&code_challenge_method=S256` +
        `&state=${btoa(verifier)}`;

      // ABRE EM ABA NOVA — 100% permitido no Manifest V3
      chrome.tabs.create({ url: authUrl, active: true });

      // Só avisa que abriu — o resto o callback do backend faz
      sendResponse({ ok: true, message: "Aba do Google aberta" });
    });

  return true; // mantém a conexão viva
});

// Listener para quando o backend terminar o login (o googleCallback.js manda isso)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === "GOOGLE_LOGIN_SUCCESS" && message.user) {
    chrome.storage.local.set({
      user_profile: message.user,
      session_token: message.session_token || "dummy"
    });
    // Atualiza popup se estiver aberto
    chrome.runtime.sendMessage({ type: "LOGIN_SUCCESS", user: message.user });
  }
});

// get_session (pra quando abrir o popup)
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "get_session") {
    chrome.storage.local.get(["user_profile", "session_token"], sendResponse);
    return true;
  }
  if (req.type === "logout") {
    chrome.storage.local.clear();
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
