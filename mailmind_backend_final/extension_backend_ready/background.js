// ===========================
// CONFIGURAÇÕES DO GOOGLE
// ===========================
const CLIENT_ID = "100486490864-t2anvobl2aig0uo0al6hkckpfk0i64on.apps.googleusercontent.com";
const BACKEND_URL = "https://mailmind-backend-09hd.onrender.com";
const SCOPES = ["profile", "email", "openid"];

// ===========================
// MONTA A URL DE LOGIN
// ===========================
function buildAuthUrl() {
  const redirectUri = chrome.identity.getRedirectURL();
  console.log("Redirect URI gerada:", redirectUri); // ← LOG NOVO: pra debug
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "token",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    prompt: "select_account"
  });
  const url = "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
  console.log("URL de auth montada:", url); // ← LOG NOVO: verifica se URL tá certa
  return url;
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
// BUSCA INFORMAÇÕES DO USUÁRIO
// ===========================
async function fetchUserInfo(accessToken) {
  console.log("Buscando userinfo com token:", accessToken ? "OK" : "NULL"); // ← LOG
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: "Bearer " + accessToken }
  });
  if (!res.ok) throw new Error("Erro userinfo: " + res.status);
  return await res.json();
}

// ===========================
// ENVIA TOKEN PARA O BACKEND
// ===========================
async function sendToBackendAndSave(accessToken, userinfo) {
  console.log("Enviando pro backend:", { email: userinfo?.email, hasToken: !!accessToken }); // ← LOG
  const url = `${BACKEND_URL}/auth/google`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "google",
      provider_id: userinfo?.sub || null,
      email: userinfo?.email || null,
      name: userinfo?.name || null,
      access_token: accessToken
    })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => null);
    console.error("Erro backend:", res.status, txt); // ← LOG DETALHADO
    throw new Error("Backend error: " + res.status + " " + txt);
  }
  const data = await res.json();
  const session_token = data.session_token;
  const user_profile = data.user;

  await chrome.storage.local.set({
    google_token: accessToken,
    session_token,
    user_profile
  });

  console.log("Login salvo com sucesso:", { email: user_profile.email, credits: user_profile.credits }); // ← LOG
  return { session_token, user_profile };
}

// ===========================
// INICIA O FLUXO DE LOGIN
// ===========================
function startGoogleLogin(sendResponse) {
  console.log("Iniciando login Google..."); // ← LOG NO INÍCIO
  const authUrl = buildAuthUrl();

  chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true // ← Força interação (popup deve abrir)
  }, async (redirectUrl) => {
    console.log("Callback do launchWebAuthFlow chamado com:", redirectUrl ? "URL OK" : "NULL"); // ← LOG CRÍTICO

    // VERIFICA ERRO SILENCIOSO (principal causa!)
    if (chrome.runtime.lastError) {
      const errMsg = chrome.runtime.lastError.message;
      console.error("Erro silencioso no launchWebAuthFlow:", errMsg);
      if (typeof sendResponse === "function") sendResponse({ error: "Falha no OAuth: " + errMsg });
      return;
    }

    if (!redirectUrl) {
      console.error("Redirect URL vazia — popup pode ter fechado cedo");
      // Fallback: Abre em nova aba se popup falhar
      chrome.tabs.create({ url: authUrl });
      if (typeof sendResponse === "function") sendResponse({ error: "Abrindo em nova aba (fallback) — complete o login lá" });
      return;
    }

    try {
      const accessToken = extractAccessTokenFromUrl(redirectUrl);
      if (!accessToken) throw new Error("access_token não encontrado na URL");

      let userinfo = null;
      try {
        userinfo = await fetchUserInfo(accessToken);
      } catch (e) {
        console.warn("Userinfo falhou, mas continua:", e.message);
      }

      const backendResp = await sendToBackendAndSave(accessToken, userinfo);
      if (typeof sendResponse === "function") sendResponse({ ok: true, user: backendResp.user_profile });
    } catch (err) {
      console.error("Erro no fluxo completo:", err);
      if (typeof sendResponse === "function") sendResponse({ error: String(err) });
    }
  });
}

// ===========================
// LISTENER (igual, mas com log)
// ===========================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Mensagem recebida no background:", message); // ← LOG
  if (!message) { 
    sendResponse({ error: "mensagem vazia" }); 
    return true; 
  }

  if (message.type === "login" || message.action === "loginGoogle") {
    startGoogleLogin(sendResponse);
    return true; // Assíncrono
  }

  // LOGOUT (igual)
  if (message.type === "logout") {
    chrome.storage.local.get(['google_token','session_token'], async (res) => {
      const token = res.google_token;
      const session = res.session_token;
      try { 
        if (session) await fetch(BACKEND_URL + '/auth/logout', { 
          method: 'POST', 
          headers: { 'Authorization': 'Bearer ' + session } 
        }); 
      } catch(e){ 
        console.warn('Logout backend falhou', e); 
      }
      if (token) {
        try { 
          await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(token), { method: 'POST' }); 
        } catch(e){ 
          console.warn('revoke fail', e); 
        }
      }
      chrome.storage.local.remove(['google_token','session_token','user_profile'], () => sendResponse({ ok: true }));
    });
    return true;
  }

  // GET SESSION (igual)
  if (message.type === "get_session") {
    chrome.storage.local.get(['google_token','session_token','user_profile'], (res) => {
      console.log("Sessão atual:", res); // ← LOG
      sendResponse(res);
    });
    return true;
  }

  sendResponse({ error: "tipo de mensagem desconhecido" });
  return false;
});
