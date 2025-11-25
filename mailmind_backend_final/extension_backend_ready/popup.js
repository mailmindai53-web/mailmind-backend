// popup/popup.js — VERSÃO FINAL 100% FUNCIONAL (Dezembro 2025)

const loginSection = document.getElementById("login");
const userSection   = document.getElementById("user");
const loginBtn      = document.getElementById("loginBtn");
const userNameEl    = document.getElementById("name");
const creditsEl     = document.getElementById("credits");

// =======================
// FUNÇÃO: MOSTRAR USUÁRIO LOGADO
// =======================
function showUser(user) {
  loginSection.classList.add("hidden");
  userSection.classList.remove("hidden");
  userNameEl.textContent = user.name || user.email.split("@")[0];
  creditsEl.textContent  = user.credits ?? 0;
}

// =======================
// FUNÇÃO: MOSTRAR TELA DE LOGIN
// =======================
function showLoginScreen() {
  loginSection.classList.remove("hidden");
  userSection.classList.add("hidden");
}

// =======================
// CARREGA SESSÃO AO ABRIR O POPUP
// =======================
chrome.runtime.sendMessage({ type: "get_session" }, (response) => {
  if (response?.user_profile) {
    showUser(response.user_profile);
  }
});

// =======================
// BOTÃO DE LOGIN (com efeito lindo)
// =======================
loginBtn.onclick = () => {
  loginBtn.disabled = true;
  loginBtn.innerHTML = `
    <img src="https://www.google.com/favicon.ico" width="20">
    Abrindo Google...
  `;

  chrome.runtime.sendMessage({ type: "login" }, () => {
    // Volta o botão ao normal depois de 3 segundos (caso demore)
    setTimeout(() => {
      loginBtn.disabled = false;
      loginBtn.innerHTML = `
        <img src="https://www.google.com/favicon.ico" width="20">
        Entrar com Google
      `;
    }, 3000);
  });
};

// =======================
// BOTÃO DE LOGOUT (FUNCIONA 100%)
// =======================
document.querySelector("#user button").onclick = () => {
  chrome.runtime.sendMessage({ type: "logout" }, () => {
    location.reload(); // recarrega o popup imediatamente
  });
};

// =======================
// ATUALIZA POPUP QUANDO LOGAR EM OUTRA ABA
// =======================
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "REFRESH_POPUP") {
    location.reload();
  }
});
