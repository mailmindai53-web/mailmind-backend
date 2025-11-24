const CLIENT_ID = "100486490864-t2anvobl2aig0uo0al6hkckpfk0i64on.apps.googleusercontent.com";
const BACKEND_URL = "https://mailmind-backend-09hd.onrender.com";
const REDIRECT_URI = "https://mailmind-backend-09hd.onrender.com/auth/google/callback";

// Gera código verificador PKCE
function generateCodeVerifier() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => String.fromCharCode(b % 36 + (b < 10 ? 48 : 87))).join('');
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "login") {
    (async () => {
      try {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await sha256(codeVerifier);

        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "openid email profile");
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");
        authUrl.searchParams.set("state", btoa(JSON.stringify({ verifier: codeVerifier })));

        // Abre popup do Google (NUNCA BLOQUEADO)
        const popup = window.open(
          authUrl.toString(),
          "google-login",
          "width=500,height=600,menubar=no,toolbar=no"
        );

        if (!popup) {
          sendResponse({ error: "Popup bloqueado. Permita popups para este site." });
          return;
        }

        // Escuta mensagem do backend (vou te dar o endpoint em 10 segundos)
        const listener = (msg) => {
          if (msg.type === "GOOGLE_LOGIN_SUCCESS") {
            chrome.runtime.onMessage.removeListener(listener);
            sendResponse({ ok: true, user: msg.user });
            popup.close();
          }
        };
        chrome.runtime.onMessage.addListener(listener);

        // Timeout de segurança
        setTimeout(() => {
          chrome.runtime.onMessage.removeListener(listener);
          sendResponse({ error: "Tempo esgotado" });
          popup.close();
        }, 5 * 60 * 1000);

      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();

    return true; // mantém conexão viva
  }

  return false;
});
