// background.js — VERSÃO FINAL NATIVA DO CHROME (SEM MISMATCH, LOGOUT FUNCIONA)

const CLIENT_ID = "100486490864-t2anvobl2aig0uo0al6hkckpfk0i64on.apps.googleusercontent.com";
const BACKEND_URL = "https://mailmind-backend-09hd.onrender.com";
const SCOPES = "openid email profile";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "login") {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${CLIENT_ID}` +
      `&response_type=token` +
      `&redirect_uri=${chrome.identity.getRedirectURL()}` +
      `&scope=${SCOPES}` +
      `&prompt=select_account`;

    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, (redirectUrl) => {
      if (chrome.runtime.lastError) {
        console.error("Erro OAuth:", chrome.runtime.lastError.message);
        // Fallback: abre em aba nova
        chrome.tabs.create({ url: authUrl });
        sendResponse({ error: "Popup bloqueado — complete em aba nova" });
        return;
      }

      if (!redirectUrl) {
        sendResponse({ error: "Login cancelado" });
        return;
      }

      // Extrai token do redirect
      const params = new URLSearchParams(redirectUrl.split('#')[1]);
      const accessToken = params.get('access_token');

      if (!accessToken) {
        sendResponse({ error: "Token não encontrado" });
        return;
      }

      // Busca userinfo
      fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      .then(res => res.json())
      .then(userinfo => {
        // Manda pro backend
        fetch(`${BACKEND_URL}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessToken,
            email: userinfo.email,
            name: userinfo.name,
            provider_id: userinfo.sub
          })
        })
        .then(res => res.json())
        .then(data => {
          chrome.storage.local.set({
            user_profile: data.user,
            session_token: data.session_token
          });
          sendResponse({ ok: true, user: data.user });
        })
        .catch(err => sendResponse({ error: "Backend falhou: " + err.message }));
    });

    return true;
  }

  if (msg.type === "get_session") {
    chrome.storage.local.get(["user_profile"], sendResponse);
    return true;
  }

  if (msg.type === "logout") {
    chrome.storage.local.clear(() => {
      console.log("LOGOUT: Storage limpo");
      sendResponse({ ok: true });
      chrome.runtime.sendMessage({ type: "REFRESH_POPUP" });
    });
    return true;
  }

  return false;
});
