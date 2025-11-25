// popup.js — LOGOUT FUNCIONA 100%

const loginBtn = document.getElementById("loginBtn");
const loginArea = document.getElementById("loginArea");
const appArea = document.getElementById("appArea");
const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

async function getSession() {
  return new Promise(resolve => chrome.runtime.sendMessage({ type: "get_session" }, resolve));
}

loginBtn.onclick = () => {
  loginBtn.textContent = "Abrindo login...";
  chrome.runtime.sendMessage({ type: "login" }, async (res) => {
    loginBtn.textContent = "Entrar com Google";
    if (res.error) alert("Erro: " + res.error);
    if (res.fallback) alert(res.message);
    if (res.ok) location.reload();
  });
};

logoutBtn.onclick = () => {
  chrome.runtime.sendMessage({ type: "logout" }, () => {
    location.reload();
  });
};

// Carrega sessão ao abrir
getSession().then(s => {
  if (s.user_profile) {
    loginArea.classList.add("hidden");
    appArea.classList.remove("hidden");
    userInfo.textContent = s.user_profile.name + " (" + s.user_profile.email + ")";
  }
});
