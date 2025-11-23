// ===========================
// CONFIGURAÇÕES DO GOOGLE
// ===========================
const CLIENT_ID = "100486490864-t2anvobl2aig0uo0al6hkckpfk0i64on.apps.googleusercontent.com";
const BACKEND_URL = "https://mailmind-backend-09hd.onrender.com"; // seu backend
const SCOPES = ["profile","email","openid"];

// ===========================
// MONTA A URL DE LOGIN
// ===========================
function buildAuthUrl() {
  const redirectUri = chrome.identity.getRedirectURL();
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "token",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    prompt: "select_account"
  });
  return "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
}

// ===========================
// EXTRAI O TOKEN DA URL
// ===========================
function extractAccessTokenFromUrl(url) {
  const hash = url.split("#")[1];
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  return params.get("access_token");
}

// ===========================
// BUSCA INFORMAÇÕES DO USUÁRIO (optional, from google)
// ===========================
async function fetchUserInfo(accessToken) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: "Bearer " + accessToken }
  });
  if (!res.ok) throw new Error("Erro userinfo: " + res.status);
  return await res.json();
}

// ===========================
// ENVIA TOKEN/USER PARA O BACKEND e salva session_token + user_profile
// ===========================
async function sendToBackendAndSave(accessToken, userinfo) {
  // Ajuste endpoint conforme seu backend (a rota deve criar/identificar usuário e retornar session_token)
  const url = `${BACKEND_URL}/auth/google`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "google",
      provider_id: userinfo && userinfo.sub ? userinfo.sub : null,
      email: userinfo && userinfo.email ? userinfo.email : null,
      name: userinfo && userinfo.name ? userinfo.name : null,
      access_token: accessToken
    })
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>null);
    throw new Error("Backend error: " + res.status + " " + txt);
  }
  const data = await res.json();
  // Espera que backend retorne { session_token: '...', user_id: '...', user: {...} }
  const session_token = data.session_token || data.token || null;
  const user_profile = data.user || userinfo || null;

  // Salva no mesmo formato que o popup espera:
  await new Promise(resolve => chrome.storage.local.set({
    google_token: accessToken,
    session_token: session_token,
    user_profile: user_profile
  }, resolve));

  return { session_token, user_profile };
}

// ===========================
// INICIA O FLUXO DE LOGIN E GERENCIA RESPOSTA
// ===========================
function startGoogleLogin(sendResponse) {
  const authUrl = buildAuthUrl();
  chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (redirectedTo) => {
    try {
      if (chrome.runtime.lastError || !redirectedTo) {
        const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : "redirectedTo vazio";
        console.error("Erro no login Google:", err);
        if (typeof sendResponse === "function") sendResponse({ error: err });
        return;
      }

      const accessToken = extractAccessTokenFromUrl(redirectedTo);
      if (!accessToken) {
        console.error("access_token não encontrado na URL.");
        if (typeof sendResponse === "function") sendResponse({ error: "access_token não encontrado" });
        return;
      }

      // opcional: pegar perfil do google
      let userinfo = null;
      try { userinfo = await fetchUserInfo(accessToken); } catch (e) { console.warn("Não foi possível buscar userinfo:", e.message); }

      // enviar para backend, salvar session_token e user_profile
      let backendResp;
      try {
        backendResp = await sendToBackendAndSave(accessToken, userinfo);
      } catch (e) {
        console.error("Erro ao contato backend:", e);
        if (typeof sendResponse === "function") sendResponse({ error: "Erro backend: " + e.message });
        return;
      }

      // responder ao popup que deu OK e enviar user_profile (para o popup exibir imediatamente)
      if (typeof sendResponse === "function") sendResponse({ ok: true, user: backendResp.user_profile });
    } catch (err) {
      console.error("Erro no fluxo login:", err);
      if (typeof sendResponse === "function") sendResponse({ error: String(err) });
    }
  });
}

// ===========================
// LISTENER: aceita { type: "login" } (compatível com popup.js) e também type "logout" e "get_session"
// ===========================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) { sendResponse({ error: "mensagem vazia" }); return true; }

  // LOGIN
  if (message.type === "login" || message.action === "loginGoogle") {
    startGoogleLogin(sendResponse);
    // return true -> indica que a resposta será enviada assincronamente
    return true;
  }

  // LOGOUT
  if (message.type === "logout") {
    chrome.storage.local.get(['google_token','session_token'], async (res) => {
      const token = res.google_token;
      const session = res.session_token;
      // opcional: notificar backend
      try { if (session) await fetch(BACKEND_URL + '/auth/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + session } }); } catch(e){ console.warn('Logout backend falhou', e); }
      // tentar revogar token google
      if (token) {
        try { await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(token), { method: 'POST' }); } catch(e){console.warn('revoke fail', e);}
      }
      chrome.storage.local.remove(['google_token','session_token','user_profile'], () => sendResponse({ ok: true }));
    });
    return true;
  }

  // GET SESSION
  if (message.type === "get_session") {
    chrome.storage.local.get(['google_token','session_token','user_profile'], (res) => sendResponse(res));
    return true;
  }

  // default
  sendResponse({ error: "tipo de mensagem desconhecido" });
  return false;
});
