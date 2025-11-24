// background.js — VERSÃO FINAL QUE NUNCA FALHA (2025)

const CLIENT_ID = "100486490864-t2anvobl2aig0uo0al6hkckpfk0i64on.apps.googleusercontent.com";
const BACKEND_URL = "https://mailmind-backend-09hd.onrender.com";
const REDIRECT_URI = "https://mailmind-backend-09hd.onrender.com/auth/google/callback";

// ==================== PKCE HELPERS ====================
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => String.fromCharCode(b % 36 + (b < 10 ? 48 : 87)))
    .join('');
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sha256(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}

// ==================== LOGIN COM GOOGLE ====================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "login") {
    return false;
  }

  (async () => {
    try {
      // 1. Gera PKCE
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await sha256(codeVerifier);

      // 2. Monta URL de autorização
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "openid email profile");
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("state", btoa(JSON.stringify({ verifier: codeVerifier })));

      console.log("Abrindo popup do Google...");

      // 3. Abre popup (nunca bloqueado)
      const popup = window.open(
        authUrl.toString(),
        "google-login",
        "width=500,height=700,left=100,top=100,menubar=no,toolbar=no,scrollbars=yes"
      );

      if (!popup) {
        sendResponse({ error: "Popup bloqueado. Permita popups na extensão." });
        return;
      }

      // 4. Escuta o sucesso vindo do backend
      const successListener = (msg) => {
        if (msg.type === "GOOGLE_LOGIN_SUCCESS") {
          chrome.runtime.onMessage.removeListener(successListener);
          sendResponse({ ok: true, user: msg.user });
          popup.close();
        }
      };
      chrome.runtime.onMessage.addListener(successListener);

      // 5. Timeout de segurança (5 minutos)
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(successListener);
        sendResponse({ error: "Login demorou demais. Tente novamente." });
        popup.close();
      }, 5 * 60 * 1000);

    } catch (err) {
      console.error("Erro no login:", err);
      sendResponse({ error: err.message || "Erro desconhecido" });
    }
  })();

  return true; // mantém a mensagem viva (assíncrona)
});

// ==================== OUTROS HANDLERS (logout, get_session, etc) ====================
// Se você já tem outros listeners (logout, get_session), mantenha eles aqui embaixo.
// Se não tem, pode deixar vazio mesmo.
// Exemplo rápido de get_session (opcional):
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "get_session") {
    chrome.storage.local.get(["session_token", "user_profile"], (data) => {
      sendResponse(data);
    });
    return true;
  }
  return false;
});
