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
  console.log("Redirect URI:", redirectUri);
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
// BUSCA INFORMAÇÕES DO USUÁRIO
// ===========================
async function fetchUserInfo(accessToken) {
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

  // ← NOVO: Notifica todos os popups abertos que o login completou
  chrome.runtime.sendMessage({ type: "LOGIN_SUCCESS", user: user_profile });
  return { session_token, user_profile };
}

// ===========================
// INICIA O FLUXO DE LOGIN (COM FALLBACK PRA ABA NOVA)
// ===========================
function startGoogleLogin(sendResponse) {
  console.log("Iniciando login Google...");
  const authUrl = buildAuthUrl();

  // Tenta primeiro com popup (como antes)
  chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true
  }, async (redirectUrl) => {
    console.log("Callback popup chamado:", redirectUrl ? "URL OK" : "NULL");

    if (chrome.runtime.lastError) {
      console.error("Erro no popup auth:", chrome.runtime.lastError.message);
      // Fallback: Abre em aba nova
      chrome.tabs.create({ url: authUrl, active: true });
      if (typeof sendResponse === "function") sendResponse({ fallback: true, message: "Abrindo em aba nova — complete o login lá e feche a aba para voltar" });
      return;
    }

    if (!redirectUrl) {
      console.error("Redirect vazio — abrindo fallback aba");
      chrome.tabs.create({ url: authUrl, active: true });
      if (typeof sendResponse === "function") sendResponse({ fallback: true, message: "Login em aba nova" });
      return;
    }

    // Processa o sucesso (igual antes)
    try {
      const accessToken = extractAccessTokenFromUrl(redirectUrl);
      if (!accessToken) throw new Error("access_token não encontrado");

      let userinfo = null;
      try {
        userinfo = await fetchUserInfo(accessToken);
      } catch (e) {
        console.warn("Userinfo falhou:", e.message);
      }

      const backendResp = await sendToBackendAndSave(accessToken, userinfo);
      if (typeof sendResponse === "function") sendResponse({ ok: true, user: backendResp.user_profile });
    } catch (err) {
      console.error("Erro no fluxo:", err);
      if (typeof sendResponse === "function") sendResponse({ error: String(err) });
    }
  });
}

// ===========================
// LISTENER (com novo handler pra sucesso)
// ===========================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Mensagem recebida:", message);

  if (!message) { sendResponse({ error: "mensagem vazia" }); return true; }

  if (message.type === "login" || message.action === "loginGoogle") {
    startGoogleLogin(sendResponse);
    return true;
  }

  // NOVO: Popup escuta sucesso e atualiza UI
  if (message.type === "LOGIN_SUCCESS") {
    // Se popup estiver aberto, recarrega ele
    if (sender.tab && sender.tab.id) {
      chrome.tabs.reload(sender.tab.id);
    }
    return true;
  }

  // LOGOUT e GET_SESSION (igual antes)
  if (message.type === "logout") {
    // ... (código igual do logout)
    return true;
  }

  if (message.type === "get_session") {
    chrome.storage.local.get(['google_token','session_token','user_profile'], (res) => {
      console.log("Sessão:", res);
      sendResponse(res);
    });
    return true;
  }

  sendResponse({ error: "tipo desconhecido" });
  return false;
});
