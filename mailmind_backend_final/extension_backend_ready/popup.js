// popup.js — botão bonito + feedback + login perfeito

const loginBtn = document.getElementById("login-btn");
const loginSection = document.getElementById("login-section");
const userInfo = document.getElementById("user-info");
const userNameEl = document.getElementById("user-name");
const creditsEl = document.getElementById("credits-count");
const logoutBtn = document.getElementById("logout-btn");

function showLoggedIn(user) {
  loginSection.classList.add("hidden");
  userInfo.classList.remove("hidden");
  userNameEl.textContent = user.name || user.email.split("@")[0];
  creditsEl.textContent = user.credits;
}

function showLogin() {
  loginSection.classList.remove("hidden");
  userInfo.classList.add("hidden");
}

// Carrega sessão ao abrir
chrome.runtime.sendMessage({ type: "get_session" }, (res) => {
  if (res?.user_profile) {
    showLoggedIn(res.user_profile);
  }
});

// Botão de login com efeito lindo
loginBtn.onclick = () => {
  loginBtn.classList.add("loading");
  loginBtn.innerHTML = `
    <img src="https://www.google.com/favicon.ico" alt="G">
    Abrindo login...
  `;

  chrome.runtime.sendMessage({ type: "login" }, (response) => {
    loginBtn.classList.remove("loading");
    loginBtn.innerHTML = `
      <img src="https://www.google.com/favicon.ico" alt="G">
      Entrar com Google
    `;

    if (response?.ok) {
      showLoggedIn(response.user);
    } else if (response?.error) {
      alert("Erro: " + response.error);
    }
  });
};

// Logout
logoutBtn.onclick = () => {
  chrome.runtime.sendMessage({ type: "logout" }, () => {
    showLogin();
  });
};

// Atualiza créditos em tempo real (se precisar)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "LOGIN_SUCCESS" && msg.user) {
    showLoggedIn(msg.user);
  }
});
